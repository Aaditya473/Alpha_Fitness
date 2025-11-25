document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.book-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const trainer = btn.getAttribute('data-trainer');
      if (typeof openChat === 'function') {
        openChat(`Hi, I’d like to book a session with ${trainer}.`);
      } else {
        alert(`Booking request for ${trainer}.`);
      }
    });
  });
});
