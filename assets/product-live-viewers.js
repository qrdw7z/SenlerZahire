if (!customElements.get('product-live-viewers')) {
  class ProductLiveViewers extends HTMLElement {
    connectedCallback() {
      if (this.dataset.liveUpdate !== 'true') return;

      this.textEl = this.querySelector('[data-live-viewers-text]');
      if (!this.textEl) return;

      this.min = parseInt(this.dataset.min, 10) || 1;
      this.max = parseInt(this.dataset.max, 10) || this.min;

      const match = this.textEl.textContent.match(/\d+/);
      this.count = match ? parseInt(match[0], 10) : this.min;

      this.scheduleNext();
    }

    disconnectedCallback() {
      clearTimeout(this.timer);
    }

    scheduleNext() {
      const delay = 20000 + Math.random() * 40000;
      this.timer = setTimeout(() => this.tick(), delay);
    }

    tick() {
      const step = Math.random() < 0.5 ? -1 : 1;
      this.count = Math.min(this.max, Math.max(this.min, this.count + step));
      this.textEl.textContent = this.textEl.textContent.replace(/\d+/, this.count);
      this.scheduleNext();
    }
  }

  customElements.define('product-live-viewers', ProductLiveViewers);
}
