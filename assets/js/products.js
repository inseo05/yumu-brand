/**
 * YUMU - Products page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.products__title');
  const filterButtons = document.querySelectorAll('.products__filter-button');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;

      filterButtons.forEach((btn) => {
        btn.classList.remove('products__filter-button--active');
        btn.setAttribute('aria-pressed', 'false');
      });

      button.classList.add('products__filter-button--active');
      button.setAttribute('aria-pressed', 'true');

      if (title && category) {
        title.textContent = category;
      }
    });
  });
});
