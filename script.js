// ── Global Cart Utility (localStorage-based) ──────────────────────
window.DivineCart = {
    _baseKey: 'divine_cart',
    get KEY() {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return u.id ? `${this._baseKey}_${u.id}` : this._baseKey;
        } catch { return this._baseKey; }
    },
    VERSION_KEY: 'divine_cart_ver',
    CURRENT_VERSION: '2',

    init() {
        // Clear cart if it's from old version (was hardcoded to Ganesha only)
        const ver = localStorage.getItem(this.VERSION_KEY);
        if (ver !== this.CURRENT_VERSION) {
            localStorage.removeItem(this.KEY);
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }
    },

    getCart() {
        try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
        catch (e) { return []; }
    },

    saveCart(items) {
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateBadge();
    },

    addItem(item) {
        // item: { id, title, meta, img, price, qty }
        // 🔒 Auth guard — block unauthenticated add-to-cart globally
        if (!localStorage.getItem('user')) {
            alert('Please login to add items to your bag.');
            window.location.href = 'login.html';
            return;
        }
        const cart = this.getCart();
        const existing = cart.find(c => c.id === item.id && c.meta === item.meta);
        if (existing) {
            existing.qty = Math.min(20, existing.qty + item.qty);
        } else {
            cart.push(item);
        }
        this.saveCart(cart);
    },

    removeItem(index) {
        const cart = this.getCart();
        cart.splice(index, 1);
        this.saveCart(cart);
    },

    updateQty(index, qty) {
        const cart = this.getCart();
        qty = Math.min(20, Math.max(1, qty));
        if (cart[index]) cart[index].qty = qty;
        this.saveCart(cart);
    },

    totalItems() {
        return this.getCart().reduce((s, i) => s + i.qty, 0);
    },

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;
        const count = this.totalItems();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DivineCart.init(); // clear stale cart if old version

    let allProductsGlobal = [];

    // Fetch products from backend
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            const result = await response.json();

            if (result.success && result.data) {
                allProductsGlobal = result.data;
                renderProducts(allProductsGlobal);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const trendingGrid = document.getElementById('trending-grid');

    const renderProducts = (productsToRender) => {
        if (!trendingGrid) return;

        trendingGrid.innerHTML = ''; // Clear loading state or previous items

        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';

            const badgeHtml = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';

            const productId = String(product._id || product.id);
            const isLiked = JSON.parse(localStorage.getItem('liked_products') || '[]').includes(productId);
            const svgFill = isLiked ? 'var(--primary-color)' : 'none';
            const svgStroke = isLiked ? 'var(--primary-color)' : 'currentColor';

            productCard.innerHTML = `
                <a href="product.html?id=${productId}" class="product-link">
                    <div class="product-image">
                        ${badgeHtml}
                        <img src="${product.image}" alt="${product.title}" loading="lazy">
                        <div class="product-icon-overlay" data-id="${productId}">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="${svgFill}" stroke="${svgStroke}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="product-price" style="margin-bottom: 0;">
                                ${product.discount ? `<span style="text-decoration: line-through; color: var(--text-muted); margin-right: 5px; font-size: 0.9em;">${product.price}</span> ₹${product.discount.toLocaleString('en-IN')}` : product.price}
                            </div>
                            <div style="font-size: 0.8rem; font-weight: 600; color: ${product.stock === 0 ? '#b91c1c' : (product.stock < 10 ? '#b45309' : '#1a7f37')};">
                                ${product.stock === 0 ? 'Out of Stock' : (product.stock < 10 ? `Only ${product.stock} Left` : '')}
                            </div>
                        </div>
                    </div>
                </a>
            `;

            trendingGrid.appendChild(productCard);
        });
    };

    // Initialize fetching
    if (trendingGrid) {
        fetchProducts();
    }

    // New Arrivals Filter Filter Logic
    const newArrivalLinks = document.querySelectorAll('.filter-new-arrivals');
    newArrivalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Optional: e.preventDefault(); if you don't want it to jump down, but since we have href="#shop", jumping down is good.
            const gridTitle = document.getElementById('trending-title');
            if (gridTitle) gridTitle.innerText = 'New Arrivals';

            // Sort by createdAt descending (newest first). Fallback to _id parsing if no explicit createdAt.
            const sortedProducts = [...allProductsGlobal].sort((a, b) => {
                // If createdAt exists, use it. Mongoose ObjectIDs can also determine creation time if needed, but we explicitly added createdAt.
                const timeA = new Date(a.createdAt || parseInt(String(a._id).substring(0, 8), 16) * 1000).getTime();
                const timeB = new Date(b.createdAt || parseInt(String(b._id).substring(0, 8), 16) * 1000).getTime();
                return timeB - timeA;
            });

            renderProducts(sortedProducts);
        });
    });

    // Interactive heart icon for likes
    document.addEventListener('click', (e) => {
        const heartOverlay = e.target.closest('.product-icon-overlay');
        if (heartOverlay) {
            e.preventDefault();
            const productId = heartOverlay.getAttribute('data-id');
            let likedProducts = JSON.parse(localStorage.getItem('liked_products') || '[]');

            const svg = heartOverlay.querySelector('svg');
            if (svg.getAttribute('fill') === 'none') {
                svg.setAttribute('fill', 'var(--primary-color)');
                svg.setAttribute('stroke', 'var(--primary-color)');
                if (!likedProducts.includes(productId)) likedProducts.push(productId);
            } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                likedProducts = likedProducts.filter(id => id !== productId);
            }
            localStorage.setItem('liked_products', JSON.stringify(likedProducts));
        }
    });

    // Nav active state toggling
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Global Authentication State Parsing
    const userSession = localStorage.getItem('user');
    const authLink = document.getElementById('authLink');
    if (userSession && authLink) {
        try {
            const userData = JSON.parse(userSession);

            // Turn the user icon into a link to account page
            authLink.innerHTML = `
                <span style="display:flex;align-items:center;gap:6px;">
                    <span style="width:30px;height:30px;border-radius:50%;background:var(--primary-color);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">
                        ${(userData.fname || '?')[0].toUpperCase()}
                    </span>
                    <span style="font-weight:600; font-size: 0.88rem;">${userData.fname}</span>
                </span>`;
            authLink.title = "My Account";
            authLink.href = "account.html";
            authLink.style.textDecoration = "none";
            authLink.style.color = "var(--text-color)";

            // Create My Account quick-link
            const myAccountLink = document.createElement('a');
            myAccountLink.innerHTML = "My Account";
            myAccountLink.href = "account.html";
            myAccountLink.className = "nav-icon";
            myAccountLink.style.fontSize = "0.85rem";
            myAccountLink.style.fontWeight = "600";
            myAccountLink.style.textDecoration = "none";
            myAccountLink.style.marginRight = "10px";
            authLink.parentNode.insertBefore(myAccountLink, authLink);

        } catch (e) {
            console.error('Session error', e);
        }
    }
});
