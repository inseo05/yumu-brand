/**
 * YUMU - Products page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.products__title');
  const filterButtons = document.querySelectorAll('.products__filter-button');
  const productCards = document.querySelectorAll('.products__list .product-card');

  const applyFilter = (filter) => {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;

      btn.classList.toggle('products__filter-button--active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    if (title) {
      title.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
    }

    productCards.forEach((card) => {
      const categories = (card.dataset.category || '').split(' ');
      card.hidden = filter !== 'all' && !categories.includes(filter);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.filter) {
        applyFilter(button.dataset.filter);
      }
    });
  });

  const requestedCategory = new URLSearchParams(window.location.search).get('category');
  const isKnownCategory = Array.from(filterButtons).some((btn) => btn.dataset.filter === requestedCategory);

  if (isKnownCategory) {
    applyFilter(requestedCategory);
  }
});
