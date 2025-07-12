// Main JavaScript file for Banaras Bartan website




document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});


/* ────────────────  Image‑Zoom Module  ──────────────── */

function initImageZoom() {
    class ImageZoom {
        constructor() {
            this.modal = null;
            this.zoomedImage = null;
            this.currentScale = 1;
            this.minScale = 0.5;
            this.maxScale = 5;
            this.scaleStep = 0.2;
            this.isDragging = false;
            this.startX = 0;
            this.startY = 0;
            this.translateX = 0;
            this.translateY = 0;
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
            } else {
                this.setupEventListeners();
            }
        }

        setupEventListeners() {
            this.modal = document.getElementById('imageZoomModal');
            this.zoomedImage = document.getElementById('zoomedImage');
            if (!this.modal || !this.zoomedImage) return;

            this.setupZoomableImages();
            this.setupModalListeners();
            this.setupKeyboardNavigation();
            this.setupWheelZoom();
            this.setupDragFunctionality();
            this.setupTouchGestures();
        }

        setupZoomableImages() {
            const zoomableContainers = document.querySelectorAll('.zoomable-image-container');

            zoomableContainers.forEach(container => {
                const image = container.querySelector('.zoomable-image');
                if (image) {
                    // Click opens modal
                    container.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openZoomModal(container);
                    });

                    // Prevent text selection on double‑click
                    container.addEventListener('selectstart', e => e.preventDefault());

                    // Show loading spinner until the image finishes
                    this.setupImageLoading(image);
                }
            });
        }

        setupImageLoading(image) {
            const container = image.closest('.zoomable-image-container');

            // Loading spinner
            const loading = document.createElement('div');
            loading.className = 'loading-indicator position-absolute top-50 start-50 translate-middle';
            loading.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x text-primary"></i>';
            loading.style.display = 'none';
            container.appendChild(loading);

            if (!image.complete) {
                loading.style.display = 'block';
                image.addEventListener('load', () => loading.style.display = 'none');
                image.addEventListener('error', () => {
                    loading.style.display = 'none';
                    const errorIcon = document.createElement('div');
                    errorIcon.className = 'position-absolute top-50 start-50 translate-middle text-muted';
                    errorIcon.innerHTML = '<i class="fas fa-image fa-2x"></i><br><small>Image unavailable</small>';
                    container.appendChild(errorIcon);
                });
            }
        }

        setupModalListeners() {
    this.modal.addEventListener('show.bs.modal', () => this.resetZoom());

    this.modal.addEventListener('hidden.bs.modal', () => {
        this.resetZoom();
        this.zoomedImage.src = '';

        // 🔧 FIX to unfreeze page after closing zoom modal
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    });
}


        setupKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                if (!this.modal.classList.contains('show')) return;

                switch (e.key) {
                    case 'Escape':
                        this.closeModal(); break;
                    case '+': case '=':
                        e.preventDefault(); this.zoomIn(); break;
                    case '-': case '_':
                        e.preventDefault(); this.zoomOut(); break;
                    case '0':
                        e.preventDefault(); this.resetZoom(); break;
                    case 'ArrowLeft':
                        this.panImage(-50, 0); break;
                    case 'ArrowRight':
                        this.panImage(50, 0); break;
                    case 'ArrowUp':
                        this.panImage(0, -50); break;
                    case 'ArrowDown':
                        this.panImage(0, 50); break;
                }
            });
        }

        setupWheelZoom() {
            this.zoomedImage.addEventListener('wheel', (e) => {
                e.preventDefault();
                (e.deltaY < 0) ? this.zoomIn() : this.zoomOut();
            });
        }

        setupDragFunctionality() {
            let startX = 0, startY = 0, startTx = 0, startTy = 0;

            this.zoomedImage.addEventListener('mousedown', (e) => {
                if (this.currentScale <= 1) return;
                e.preventDefault();
                this.isDragging = true;
                startX = e.clientX; startY = e.clientY;
                startTx = this.translateX; startTy = this.translateY;
                this.zoomedImage.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                this.translateX = startTx + dx;
                this.translateY = startTy + dy;
                this.updateImageTransform();
            });

            document.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.zoomedImage.style.cursor = this.currentScale > 1 ? 'grab' : 'default';
                }
            });
        }

        setupTouchGestures() {
            let initialDist = 0, initialScale = 1;
            let startTx = 0, startTy = 0, startX = 0, startY = 0;

            this.zoomedImage.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isDragging = true;
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    startTx = this.translateX;
                    startTy = this.translateY;
                } else if (e.touches.length === 2) {
                    this.isDragging = false;
                    const [t1, t2] = e.touches;
                    initialDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    initialScale = this.currentScale;
                }
            });

            this.zoomedImage.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && this.isDragging) {
                    const dx = e.touches[0].clientX - startX;
                    const dy = e.touches[0].clientY - startY;
                    this.translateX = startTx + dx;
                    this.translateY = startTy + dy;
                    this.updateImageTransform();
                } else if (e.touches.length === 2) {
                    const [t1, t2] = e.touches;
                    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    const scale = initialScale * (dist / initialDist);
                    this.setZoom(Math.max(this.minScale, Math.min(this.maxScale, scale)));
                }
            });

            this.zoomedImage.addEventListener('touchend', () => { this.isDragging = false; });
        }

        openZoomModal(container) {
            const img = container.querySelector('.zoomable-image');
            const title = container.dataset.title || 'Product Image';
            if (!img) return;

            document.getElementById('zoomModalTitle').textContent = title;
            this.zoomedImage.src = container.dataset.image || img.src;

            const bsModal = new bootstrap.Modal(this.modal);
            bsModal.show();

            this.zoomedImage.style.opacity = '0.5';
            this.zoomedImage.onload = () => this.zoomedImage.style.opacity = '1';
        }

        closeModal() {
            const bsModal = bootstrap.Modal.getInstance(this.modal);
            if (bsModal) bsModal.hide();
        }

        zoomIn() { this.setZoom(Math.min(this.maxScale, this.currentScale + this.scaleStep)); }
        zoomOut() { this.setZoom(Math.max(this.minScale, this.currentScale - this.scaleStep)); }

        setZoom(scale) {
            this.currentScale = scale;
            this.updateImageTransform();
            this.zoomedImage.style.cursor = scale > 1 ? 'grab' : 'default';
            if (scale <= 1) { this.translateX = 0; this.translateY = 0; }
        }

        resetZoom() {
            this.currentScale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.updateImageTransform();
            this.zoomedImage.style.cursor = 'default';
        }

        panImage(dx, dy) {
            this.translateX += dx;
            this.translateY += dy;
            this.updateImageTransform();
        }

        updateImageTransform() {
            const t = `scale(${this.currentScale}) translate(${this.translateX / this.currentScale}px, ${this.translateY / this.currentScale}px)`;
            this.zoomedImage.style.transform = t;
        }

        

    } // <-- Close the ImageZoom class here

    /* ── ADD THESE LINES ───────────────────────────── */
    window.imageZoom = new ImageZoom();          // create one instance
    window.zoomIn = () => window.imageZoom.zoomIn();
    window.zoomOut = () => window.imageZoom.zoomOut();
    window.resetZoom = () => window.imageZoom.resetZoom();
    /* ──────────────────────────────────────────────── */

    // <-- this closes the initImageZoom() function
    /* ───────────── End Image‑Zoom Module ───────────── */
    // <-- Close the ImageZoom class here
    const zoom = new ImageZoom();
    window.imageZoom = zoom;
}
/* ───────────── End Image‑Zoom Module ───────────── */


function initializeApp() {
    // Initialize smooth scrolling
    initSmoothScrolling();

    // Initialize animations
    initScrollAnimations();

    // Initialize admin modal
    initAdminModal();

    // Add loading states to buttons
    initButtonLoading();



    initImageZoom();

    console.log('Banaras Bartan website initialized successfully');
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const links = document.querySelectorAll('.smooth-scroll');

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe product cards
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Initialize admin modal functionality
function initAdminModal() {
    // Show admin modal
    window.showAdminModal = function () {
        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();

        // Clear previous inputs
        document.getElementById('adminCode').value = '';
        document.getElementById('adminLogin').classList.remove('d-none');
        document.getElementById('adminPanel').classList.add('d-none');
    };

    // Check admin access for orders page
    window.checkAdminAccess = function () {
        // Allow access - backend will handle authentication
        return true;
    };
}

// Add loading states to buttons
function initButtonLoading() {
    const actionButtons = document.querySelectorAll('.btn-action');

    actionButtons.forEach(button => {
        button.addEventListener('click', function () {
            if (this.classList.contains('btn-success')) {
                // WhatsApp button - show brief loading
                showButtonLoading(this, 500);
            }
        });
    });
}

// Show loading state on button
function showButtonLoading(button, duration = 1000) {
    const originalContent = button.innerHTML;
    const loadingContent = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';

    button.innerHTML = loadingContent;
    button.disabled = true;

    setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
    }, duration);
}

// Show loading spinner
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('d-none');
}

// Hide loading spinner
function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('d-none');
}

// Admin login function
async function adminLogin() {
    const code = document.getElementById('adminCode').value;

    if (!code) {
        showAlert('Please enter the admin code', 'warning');
        return;
    }

    showLoading();

    try {
        const formData = new FormData();
        formData.append('code', code);

        const response = await fetch('/admin/login', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('adminLogin').classList.add('d-none');
            document.getElementById('adminPanel').classList.remove('d-none');
            showAlert('Admin access granted!', 'success');
        } else {
            showAlert('Invalid admin code', 'danger');
            document.getElementById('adminCode').value = '';
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        showAlert('Error during login. Please try again.', 'danger');
    } finally {
        hideLoading();
    }
}

// Update products function
async function updateProducts() {
    const products = [];

    // Collect product data from all product cards
    const productCards = document.querySelectorAll('#productInputs .card');

    productCards.forEach((card, index) => {
        const cardBody = card.querySelector('.card-body');
        const name = cardBody.querySelector(`[id^="inputName"]`).value.trim();
        const description = cardBody.querySelector(`[id^="inputDescription"]`).value.trim();
        const price = cardBody.querySelector(`[id^="inputPrice"]`).value.trim();
        const image = cardBody.querySelector(`[id^="inputImage"]`).value.trim();

        if (name && price) {
            products.push({
                name,
                description: description || 'Premium cookware item',
                price: parseInt(price),
                image: image || 'https://images.unsplash.com/photo-1556909114-9e59f5a3c13b?w=400&h=300&fit=crop'
            });
        }
    });

    if (products.length === 0) {
        showAlert('Please enter at least one product with name and price', 'warning');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/admin/update-products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ products })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Products updated successfully!', 'success');
            // Reload page to show updated products
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert(data.message || 'Error updating products', 'danger');
        }
    } catch (error) {
        console.error('Error updating products:', error);
        showAlert('Error updating products. Please try again.', 'danger');
    } finally {
        hideLoading();
    }
}

// Admin logout function
async function adminLogout() {
    showLoading();

    try {
        const response = await fetch('/admin/logout', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Logged out successfully', 'info');
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showAlert('Error during logout', 'danger');
    } finally {
        hideLoading();
    }
}

// Show alert function
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-custom');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show alert-custom position-fixed`;
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';

    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Get alert icon based on type
function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Navbar scroll effect
window.addEventListener('scroll', function () {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(52, 73, 94, 0.98)';
        navbar.style.backdropFilter = 'blur(15px)';
    } else {
        navbar.style.background = 'rgba(52, 73, 94, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    }
});

// Handle image loading errors
document.addEventListener('DOMContentLoaded', function () {
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        img.addEventListener('error', function () {
            if (this.classList.contains('product-image')) {
                this.src = 'https://images.unsplash.com/photo-1556909114-9e59f5a3c13b?w=400&h=300&fit=crop';
            } else if (this.classList.contains('qr-code')) {
                this.src = 'https://via.placeholder.com/300x300/f8f9fa/6c757d?text=QR+Code';
            } else if (this.classList.contains('navbar-logo')) {
                this.src = 'https://via.placeholder.com/45x45/f39c12/ffffff?text=BB';
            }
        });
    });
});

// Add new product function
let productCounter = 3; // Starting after the default 3 products

function addNewProduct() {
    productCounter++;
    const productInputs = document.getElementById('productInputs');

    const newProductCard = document.createElement('div');
    newProductCard.className = 'col-md-4';
    newProductCard.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Product ${productCounter}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeProduct(${productCounter})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Product Name</label>
                    <input type="text" 
                           id="inputName${productCounter}" 
                           class="form-control product-input" 
                           placeholder="Enter product name">
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea id="inputDescription${productCounter}" 
                              class="form-control product-input" 
                              rows="2"
                              placeholder="Enter product description"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Price (₹)</label>
                    <input type="number" 
                           id="inputPrice${productCounter}" 
                           class="form-control product-input" 
                           placeholder="Enter price">
                </div>
                <div class="mb-3">
                    <label class="form-label">Image URL</label>
                    <input type="url" 
                           id="inputImage${productCounter}" 
                           class="form-control product-input" 
                           placeholder="https://example.com/image.jpg">
                </div>
            </div>
        </div>
    `;

    productInputs.appendChild(newProductCard);

    // Add animation
    newProductCard.style.opacity = '0';
    newProductCard.style.transform = 'translateY(20px)';
    setTimeout(() => {
        newProductCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        newProductCard.style.opacity = '1';
        newProductCard.style.transform = 'translateY(0)';
    }, 10);

    showAlert('New product card added!', 'success');
}




// Enhanced keyboard navigation
document.addEventListener('keydown', function (e) {
    // ESC key to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    // Enter key in admin code input
    if (e.key === 'Enter' && e.target.id === 'adminCode') {
        adminLogin();
    }
});

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function () {
    // Add hover effect to cards
    const cards = document.querySelectorAll('.card, .product-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});






// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
