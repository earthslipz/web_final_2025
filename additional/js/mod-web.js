document.addEventListener('DOMContentLoaded', () => {
    // Cart management
    class Cart {
        constructor() {
            this.items = JSON.parse(localStorage.getItem('cart')) || [];
            this.updateCartDisplay();
        }

        addItem(productName, price) {
            this.items.push({ name: productName, price: price, quantity: 1 });
            this.saveCart();
            this.updateCartDisplay();
        }

        saveCart() {
            localStorage.setItem('cart', JSON.stringify(this.items));
        }

        updateCartDisplay() {
            const cartLink = document.querySelector('#cart-link');
            if (cartLink) {
                const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
                cartLink.textContent = `Cart (${totalItems})`;
            }
        }
    }

    const cart = new Cart();

    // Product interactions (hover effects and cart on click)
    const productItems = document.querySelectorAll('.product-item');
    productItems.forEach(item => {
        const productName = item.querySelector('div:first-of-type').textContent;
        const price = item.querySelector('div:last-of-type').textContent;

        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-5px)';
            item.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
            item.style.boxShadow = 'none';
        });

        // item.addEventListener('click', (e) => {
        //     if (e.target.tagName !== 'A') {
        //         cart.addItem(productName, price);
        //         showNotification(`${productName} added to cart!`);
        //     }
        // });
    });

    // Notification system
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Show and hide functionality for category tabs
    function showAndHide(tabId, iconId) {
        const tab = document.getElementById(tabId);
        const icon = document.getElementById(iconId);

        if (tab.classList.contains('active')) {
            tab.classList.remove('active');
            icon.style.transform = 'rotate(0deg)';
        } else {
            // Close all other tabs
            document.querySelectorAll('.slide-tab').forEach(otherTab => {
                if (otherTab !== tab) {
                    otherTab.classList.remove('active');
                    const otherIcon = otherTab.previousElementSibling.querySelector('i');
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            tab.classList.add('active');
            icon.style.transform = 'rotate(180deg)';
        }
    }

    // Attach click events to category titles
    const categories = [
        { title: 'genshin-title', tab: 'genshin-tab', icon: 'genshin-icon' },
        { title: 'onepiece-title', tab: 'onepiece-tab', icon: 'onepiece-icon' },
        { title: 'pokemon-title', tab: 'pokemon-tab', icon: 'pokemon-icon' },
        { title: 'natsume-title', tab: 'natsume-tab', icon: 'natsume-icon' },
        { title: 'haikyuu-title', tab: 'haikyuu-tab', icon: 'haikyuu-icon' }
    ];

    categories.forEach(category => {
        const title = document.getElementById(category.title);
        title.addEventListener('click', () => {
            showAndHide(category.tab, category.icon);
        });
    });

    // Lazy loading images
    const images = document.querySelectorAll('img');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.src = entry.target.dataset.src;
                observer.unobserve(entry.target);
            }
        });
    });
    
    images.forEach(img => {
        img.dataset.src = img.src;
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        observer.observe(img);
    });

    // Back to top button
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTop.className = 'back-to-top';
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', () => {
        backToTop.style.display = window.scrollY > 200 ? 'block' : 'none';
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});