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

                // Fix to unfreeze page after closing zoom modal
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
    }

    window.imageZoom = new ImageZoom();
    window.zoomIn = () => window.imageZoom.zoomIn();
    window.zoomOut = () => window.imageZoom.zoomOut();
    window.resetZoom = () => window.imageZoom.resetZoom();
}

function initializeApp() {
    initSmoothScrolling();
    initScrollAnimations();
    initAdminModal();
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

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Initialize admin modal
function initAdminModal() {
    window.showAdminModal = function() {
        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();
    };

    window.adminLogin = async function() {
        const adminCode = document.getElementById('adminCode').value;
        
        if (!adminCode) {
            showAlert('Please enter admin code', 'warning');
            return;
        }

        const button = document.querySelector('#adminModal button[onclick="adminLogin()"]');
        showButtonLoading(button);

        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: adminCode })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('adminLogin').classList.add('d-none');
                document.getElementById('adminPanel').classList.remove('d-none');
                showAlert('Admin login successful', 'success');
                
                // Verify session is maintained
                setTimeout(() => {
                    fetch('/admin/session-check')
                        .then(response => response.json())
                        .then(sessionData => {
                            console.log('Session check:', sessionData);
                            if (!sessionData.is_admin) {
                                showAlert('Session verification failed', 'warning');
                            }
                        });
                }, 100);
            } else {
                showAlert(data.message || 'Invalid admin code', 'danger');
            }
        } catch (error) {
            showAlert('Login failed. Please try again.', 'danger');
        } finally {
            hideButtonLoading(button, '<i class="fas fa-sign-in-alt me-2"></i>Login');
        }
    };

    window.adminLogout = function() {
        fetch('/admin/logout', { method: 'POST' })
            .then(() => {
                document.getElementById('adminLogin').classList.remove('d-none');
                document.getElementById('adminPanel').classList.add('d-none');
                document.getElementById('adminCode').value = '';
                showAlert('Logged out successfully', 'info');
            });
    };
}

// Initialize button loading states
function initButtonLoading() {
    window.showButtonLoading = function(button, duration = 1000) {
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, duration);
    };

    window.hideButtonLoading = function(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

function showLoading() {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="loadingSpinner" class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `);
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.remove();
}

window.updateProducts = async function() {
    const products = [];
    const productInputs = document.querySelectorAll('#productInputs .card');

    productInputs.forEach(card => {
        const nameInput = card.querySelector('input[id*="inputName"]');
        if (!nameInput) return;
        
        const productId = nameInput.id.replace('inputName', '');
        const nameValue = document.getElementById(`inputName${productId}`)?.value || '';
        const descValue = document.getElementById(`inputDescription${productId}`)?.value || '';
        const priceValue = document.getElementById(`inputPrice${productId}`)?.value || '';
        const stockValue = document.getElementById(`inputStock${productId}`)?.value || '0';
        const imageValue = document.getElementById(`inputImage${productId}`)?.value || '';

        if (nameValue && priceValue) {
            const product = {
                id: productId,
                name: nameValue,
                description: descValue,
                price: parseInt(priceValue) || 0,
                stock: parseInt(stockValue) || 0,
                image: imageValue
            };
            products.push(product);
        }
    });

    if (products.length === 0) {
        showAlert('No valid products to update', 'warning');
        return;
    }

    const button = document.querySelector('button[onclick="updateProducts()"]');
    showButtonLoading(button);

    try {
        console.log('Updating products:', products);
        const response = await fetch('/admin/products/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ products })
        });

        if (!response.ok) {
            if (response.status === 403) {
                showAlert('Session expired. Please login again.', 'warning');
                document.getElementById('adminLogin').classList.remove('d-none');
                document.getElementById('adminPanel').classList.add('d-none');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();
        console.log('Update response:', data);

        if (data.success) {
            showAlert('Products updated successfully', 'success');
            
            // Update display
            products.forEach(product => {
                const nameEl = document.getElementById(`name${product.id}`);
                const priceEl = document.getElementById(`price${product.id}`);
                if (nameEl) nameEl.textContent = product.name;
                if (priceEl) priceEl.textContent = `₹${product.price}`;
            });
        } else {
            showAlert(data.message || 'Failed to update products', 'danger');
        }
    } catch (error) {
        console.error('Error updating products:', error);
        showAlert(`Error updating products: ${error.message}`, 'danger');
    } finally {
        hideButtonLoading(button, '<i class="fas fa-save me-2"></i>Update Products');
    }
};

window.addNewProduct = function() {
    const productCount = document.querySelectorAll('#productInputs .card').length + 1;
    const newProductId = `new${productCount}`;
    
    const newProductCard = document.createElement('div');
    newProductCard.className = 'col-md-4 new-product-card';
    newProductCard.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">New Product ${productCount}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeProduct('${newProductId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Product Name</label>
                    <input type="text" id="inputName${newProductId}" class="form-control product-input" placeholder="Enter product name">
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea id="inputDescription${newProductId}" class="form-control product-input" rows="2" placeholder="Enter product description"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Price (₹)</label>
                    <input type="number" id="inputPrice${newProductId}" class="form-control product-input" placeholder="Enter price">
                </div>
                <div class="mb-3">
                    <label class="form-label">Stock</label>
                    <input type="number" id="inputStock${newProductId}" class="form-control product-input" placeholder="Enter stock quantity">
                </div>
                <div class="mb-3">
                    <label class="form-label">Image URL</label>
                    <input type="url" id="inputImage${newProductId}" class="form-control product-input" placeholder="https://example.com/image.jpg">
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('productInputs').appendChild(newProductCard);
};

// <script>
window.removeProduct = async function (productId) {
  if (!confirm("Delete this product permanently?")) return;

  try {
    const res = await fetch(`/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
    const json = await res.json();

    if (json.success) {
      // remove from DOM
      const card = document.querySelector(
        `#productInputs input[id*="${productId}"]`
      )?.closest(".col-md-4");
      card?.remove();
      alert("Product deleted!");
    } else {
      alert(json.message || "Server said delete failed");
    }
  } catch (err) {
    console.error(err);
    alert("Network / server error while deleting");
  }
};
// </script>


function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    
    const icon = getAlertIcon(type);
    alertDiv.innerHTML = `
        ${icon} ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    switch(type) {
        case 'success': return '<i class="fas fa-check-circle me-2"></i>';
        case 'danger': return '<i class="fas fa-exclamation-circle me-2"></i>';
        case 'warning': return '<i class="fas fa-exclamation-triangle me-2"></i>';
        default: return '<i class="fas fa-info-circle me-2"></i>';
    }
}

// Admin orders functions
window.refreshOrders = function() {
    location.reload();
};

window.openStatusModal = function(orderId) {
    // Implementation for order status modal
    console.log('Opening status modal for order:', orderId);
};

window.openDetailsModal = function(orderId) {
    // Implementation for order details modal
    console.log('Opening details modal for order:', orderId);
};

window.deleteOrder = async function(btn) {
    const orderId = btn.closest('tr').dataset.id;
    
    if (!confirm('Are you sure you want to delete this order?')) {
        return;
    }

    try {
        const response = await fetch(`/admin/orders/${orderId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            btn.closest('tr').remove();
            showAlert('Order deleted successfully', 'success');
        } else {
            showAlert(data.message || 'Failed to delete order', 'danger');
        }
    } catch (error) {
        showAlert('Error deleting order', 'danger');
    }
};
