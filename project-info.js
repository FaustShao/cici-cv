const info = document.getElementById('project-info');
if (info) {
  document.querySelectorAll('[data-open-info]').forEach(button => {
    button.addEventListener('click', () => info.showModal());
  });
  info.querySelector('[data-close-info]').addEventListener('click', () => info.close());
  info.addEventListener('click', event => {
    if (event.target === info) {
      const rect = info.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) info.close();
    }
  });
}
