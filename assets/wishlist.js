/**
 * Favori Ürünlerim (wishlist) — localStorage-based, no account/app dependency.
 * Powers the heart buttons on product cards / product pages and the
 * "Favori Ürünlerim" list rendered on the customer account page.
 * @module wishlist
 */

(function () {
  const STORAGE_KEY = 'senler-wishlist';

  function readItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // Storage unavailable (private browsing, quota exceeded) — fail silently.
    }
    document.dispatchEvent(new CustomEvent('wishlist:change', { detail: { items } }));
  }

  function has(id) {
    return readItems().some((item) => String(item.id) === String(id));
  }

  function toggle(id, handle) {
    const items = readItems();
    const index = items.findIndex((item) => String(item.id) === String(id));
    if (index > -1) {
      items.splice(index, 1);
    } else {
      items.push({ id: String(id), handle });
    }
    writeItems(items);
    return index === -1;
  }

  function remove(id) {
    writeItems(readItems().filter((item) => String(item.id) !== String(id)));
  }

  function syncButtons() {
    const ids = new Set(readItems().map((item) => String(item.id)));
    document.querySelectorAll('[data-wishlist-toggle]').forEach((button) => {
      const active = ids.has(String(button.getAttribute('data-product-id')));
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wishlist-toggle]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(button.getAttribute('data-product-id'), button.getAttribute('data-product-handle'));
  });

  document.addEventListener('wishlist:change', syncButtons);
  document.addEventListener('DOMContentLoaded', syncButtons);
  if (document.readyState !== 'loading') syncButtons();

  // Product cards can be re-rendered or injected after load (quick add, section
  // hydration, infinite scroll) — keep their pressed state in sync when that happens.
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        syncButtons();
        return;
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.SenlerWishlist = { getAll: readItems, has, toggle, remove };

  // ---- "Favori Ürünlerim" list on the account page ----

  function formatMoney(cents, format) {
    const amount = (Number(cents) / 100).toFixed(2);
    const [whole, decimals] = amount.split('.');
    const withCommaSeparator = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
    const noDecimals = Math.round(Number(amount)).toString();
    return (format || '{{amount}}')
      .replace('{{amount_no_decimals_with_comma_separator}}', noDecimals.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
      .replace('{{amount_with_comma_separator}}', withCommaSeparator)
      .replace('{{amount_no_decimals}}', noDecimals)
      .replace('{{amount}}', amount);
  }

  async function renderAccountWishlist() {
    const container = document.getElementById('wishlist-account-list');
    if (!container) return;

    const grid = container.querySelector('[data-wishlist-grid]');
    const emptyState = container.querySelector('[data-wishlist-empty]');
    if (!grid) return;

    const items = readItems();

    if (items.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    const moneyFormat = container.dataset.moneyFormat;
    const removeLabel = container.dataset.removeLabel || '';

    const products = await Promise.all(
      items.map((item) =>
        fetch(`/products/${item.handle}.js`)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null)
      )
    );

    grid.innerHTML = '';
    products.forEach((product, index) => {
      if (!product) return;
      const item = items[index];
      const image = product.featured_image || (product.images && product.images[0]) || '';
      const card = document.createElement('div');
      card.className = 'wishlist-card';
      card.innerHTML = `
        <a href="/products/${product.handle}" class="wishlist-card__image-link">
          <img src="${image}" alt="" loading="lazy" width="160" height="160">
        </a>
        <div class="wishlist-card__info">
          <a href="/products/${product.handle}" class="wishlist-card__title">${product.title}</a>
          <span class="wishlist-card__price">${formatMoney(product.price, moneyFormat)}</span>
        </div>
        <button type="button" class="wishlist-card__remove" data-wishlist-remove="${item.id}" aria-label="${removeLabel}">
          <span aria-hidden="true">&times;</span>
        </button>
      `;
      grid.appendChild(card);
    });
  }

  document.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-wishlist-remove]');
    if (!removeButton) return;
    remove(removeButton.getAttribute('data-wishlist-remove'));
  });

  document.addEventListener('wishlist:change', renderAccountWishlist);
  document.addEventListener('DOMContentLoaded', renderAccountWishlist);
  if (document.readyState !== 'loading') renderAccountWishlist();
})();
