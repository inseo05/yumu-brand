/**
 * YUMU - Products page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.product-filter__button');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((btn) => btn.classList.remove('product-filter__button--active'));
      button.classList.add('product-filter__button--active');
    });
  });
});
