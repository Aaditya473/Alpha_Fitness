import os
from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from urllib.parse import urlparse   # ✅ NEW: to parse DATABASE_URL

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")

CORS(app, supports_credentials=True)


# ---------- DB CONNECTION ----------
def get_db():
    # ✅ Use single env var that Railway provides (mapped from MySQL.MYSQL_URL)
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        # You can change message if you want
        raise RuntimeError(
            "DATABASE_URL not set. In Railway, set DATABASE_URL = ${{ mysql://root:WJryBoOZmHUqgirsrEZevXDlRGnibHRh@mysql.railway.internal:3306/railway }} "
        )

    parsed = urlparse(db_url)

    return mysql.connector.connect(
        host=parsed.hostname,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path.lstrip("/"),
        port=parsed.port or 3306,
        autocommit=True
    )


# ---------- PAGE ROUTES ----------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/bmi")
def bmi_page():
    return render_template("bmi.html")


@app.route("/calorie")
def calorie_page():
    return render_template("calorie.html")


@app.route("/services")
def services_page():
    return render_template("services.html")


@app.route("/trainer")
def trainer_page():
    return render_template("trainer.html")


@app.route("/contact")
def contact_page():
    return render_template("contact.html")


@app.route("/booking")
def booking_page():
    return render_template("booking.html")


# ---------- AUTH API ----------
@app.post("/api/auth/register")
def api_register():
    data = request.get_json(silent=True) or request.form.to_dict()
    fullname = (data.get("fullname") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not fullname or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    pwd_hash = generate_password_hash(password)

    cn = get_db()
    cur = cn.cursor()
    try:
        cur.execute(
            "INSERT INTO users(fullname, email, password_hash) VALUES(%s,%s,%s)",
            (fullname, email, pwd_hash)
        )
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409

    return jsonify({"ok": True})


@app.post("/api/auth/login")
def api_login():
    data = request.get_json(silent=True) or request.form.to_dict()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    cn = get_db()
    cur = cn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, fullname, email, password_hash FROM users WHERE email=%s",
        (email,)
    )
    row = cur.fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["uid"] = row["id"]
    return jsonify({
        "id": row["id"],
        "fullname": row["fullname"],
        "email": row["email"]
    })


@app.get("/api/auth/me")
def api_me():
    uid = session.get("uid")
    if not uid:
        return jsonify({"error": "Not logged in"}), 401

    cn = get_db()
    cur = cn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, fullname, email FROM users WHERE id=%s",
        (uid,)
    )
    return jsonify(cur.fetchone())


@app.post("/api/auth/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


# ---------- SERVICES + BOOKINGS + PAYMENTS ----------
try:
    import razorpay
except Exception:
    razorpay = None


def razor_client():
    if not razorpay:
        raise RuntimeError("razorpay not installed")
    return razorpay.Client(auth=(
        os.getenv("RAZORPAY_KEY_ID", ""),
        os.getenv("RAZORPAY_KEY_SECRET", "")
    ))


@app.get("/api/services")
def api_services():
    cn = get_db()
    cur = cn.cursor(dictionary=True)
    cur.execute("SELECT id, name, description, price_inr FROM services WHERE is_active=1")
    return jsonify(cur.fetchall())


@app.post("/api/book")
def api_book():
    uid = session.get("uid")
    if not uid:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json(force=True)
    service_id = int(data.get("service_id"))

    cn = get_db()
    cur = cn.cursor(dictionary=True)
    cur.execute("SELECT id, name, price_inr FROM services WHERE id=%s AND is_active=1", (service_id,))
    svc = cur.fetchone()
    if not svc:
        return jsonify({"error": "Service not found"}), 404

    amount_rs = svc["price_inr"]
    amount_paise = amount_rs * 100

    # create booking
    cur2 = cn.cursor()
    cur2.execute(
        "INSERT INTO bookings(user_id, service_id, quantity, amount_rupees, status) "
        "VALUES(%s,%s,1,%s,'PENDING')",
        (uid, service_id, amount_rs)
    )
    booking_id = cur2.lastrowid

    # create Razorpay order
    client = razor_client()
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"bk_{booking_id}",
        "payment_capture": 1
    })

    # store payment row
    cur2.execute(
        "INSERT INTO payments(booking_id, gateway, order_id, amount_paise, status) "
        "VALUES(%s,'razorpay',%s,%s,'CREATED')",
        (booking_id, order["id"], amount_paise)
    )

    return jsonify({
        "booking_id": booking_id,
        "order_id": order["id"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID", "")
    })


@app.get("/api/bookings/mine")
def api_my_bookings():
    uid = session.get("uid")
    if not uid:
        return jsonify({"error": "Not logged in"}), 401

    cn = get_db()
    cur = cn.cursor(dictionary=True)
    cur.execute("""
        SELECT b.id, s.name AS service, b.quantity, b.amount_rupees, b.status, b.created_at
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        WHERE b.user_id = %s
        ORDER BY b.created_at DESC
    """, (uid,))
    return jsonify(cur.fetchall())


@app.post("/api/payments/razorpay/webhook")
def api_rzp_webhook():
    if not razorpay:
        return "", 200

    import razorpay as rz
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    raw_body = request.data
    sign = request.headers.get("X-Razorpay-Signature")

    try:
        rz.Utility.verify_webhook_signature(raw_body, sign, secret)
    except Exception:
        return "Invalid signature", 400

    data = request.get_json()
    evt = data.get("event", "")
    if evt == "payment.captured":
        order_id = data["payload"]["payment"]["entity"]["order_id"]
        payment_id = data["payload"]["payment"]["entity"]["id"]
        cn = get_db()
        cur = cn.cursor()
        cur.execute(
            "UPDATE payments SET payment_id=%s, status='SUCCESS' WHERE order_id=%s",
            (payment_id, order_id)
        )
        cur.execute("""
            UPDATE bookings b
            JOIN payments p ON p.booking_id = b.id
            SET b.status = 'PAID'
            WHERE p.order_id = %s
        """, (order_id,))
    return "", 200


# ---------- CONTACT FORM ----------
@app.post("/contact")
def contact_submit():
    name = request.form.get("name", "")
    email = request.form.get("email", "")
    message = request.form.get("message", "")

    cn = get_db()
    cur = cn.cursor()
    cur.execute(
        "INSERT INTO contact_messages(name, email, message) VALUES(%s,%s,%s)",
        (name, email, message)
    )
    return jsonify({"message": "Message sent successfully!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
