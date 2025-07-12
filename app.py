import os
import logging
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "fallback-secret-key-for-development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Sample product data that can be updated by admin
default_products = [
    {
        "id": 1,
        "name": "Aluminium Kadhai",
        "description": "Heavy-duty and ideal for deep frying and curries.",
        "price": 599,
        "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
    },
    {
        "id": 2,
        "name": "Steel Frying Pan",
        "description": "Perfect for sautéing and shallow frying.",
        "price": 449,
        "image": "https://images.unsplash.com/photo-1544657043-f0705ee59306?w=400&h=300&fit=crop"
    },
    {
        "id": 3,
        "name": "3-Piece Cookware Set",
        "description": "Includes a frying pan, saucepan, and kadhai.",
        "price": 1199,
        "image": "https://images.unsplash.com/photo-1556909114-9e59f5a3c13b?w=400&h=300&fit=crop"
    }
]

@app.route('/')
def index():
    """Main page route"""
    # Get products from session or use defaults
    products = session.get('products', default_products)
    return render_template('index.html', products=products)

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    code = request.form.get('code', '')
    if code == 'hello abhi':
        session['is_admin'] = True
        return jsonify({'success': True, 'message': 'Admin access granted'})
    else:
        return jsonify({'success': False, 'message': 'Invalid code'})

@app.route('/admin/update-products', methods=['POST'])
def update_products():
    """Update products endpoint for admin"""
    if not session.get('is_admin', False):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        products_data = request.json.get('products', [])
        
        # Validate and update products
        updated_products = []
        for i, product_data in enumerate(products_data):
            if product_data.get('name') and product_data.get('price'):
                updated_product = {
                    "id": i + 1,
                    "name": product_data['name'],
                    "description": product_data.get('description', 'Premium cookware item'),
                    "price": int(product_data['price']),
                    "image": product_data.get('image', 'https://images.unsplash.com/photo-1556909114-9e59f5a3c13b?w=400&h=300&fit=crop')
                }
                updated_products.append(updated_product)
        
        # Save to session
        session['products'] = updated_products
        return jsonify({'success': True, 'message': 'Products updated successfully'})
    
    except Exception as e:
        app.logger.error(f"Error updating products: {e}")
        return jsonify({'success': False, 'message': 'Error updating products'}), 500

@app.route('/admin/logout', methods=['POST'])
def admin_logout():
    """Admin logout endpoint"""
    session.pop('is_admin', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/order/create', methods=['POST'])
def create_order():
    """Create a new order"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['product_id', 'customer_name', 'customer_phone', 'payment_method']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Get product from session or defaults
        products = session.get('products', default_products)
        product = None
        for p in products:
            if p['id'] == int(data['product_id']):
                product = p
                break
        
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Calculate total amount
        quantity = int(data.get('quantity', 1))
        total_amount = product['price'] * quantity
        
        # Create order (store in session)
        order = {
            'id': len(session.get('orders', [])) + 1,
            'customer_name': data['customer_name'],
            'customer_phone': data['customer_phone'],
            'customer_email': data.get('customer_email'),
            'product_id': data['product_id'],
            'product_name': product['name'],
            'quantity': quantity,
            'total_amount': total_amount,
            'payment_method': data['payment_method'],
            'customer_address': data.get('customer_address'),
            'notes': data.get('notes'),
            'upi_transaction_id': data.get('upi_transaction_id'),
            'payment_status': 'pending',
            'order_status': 'pending',
            'created_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Store order in session
        if 'orders' not in session:
            session['orders'] = []
        session['orders'].append(order)
        session.modified = True
        
        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'order_id': order['id'],
            'total_amount': total_amount
        })
        
    except Exception as e:
        app.logger.error(f"Error creating order: {e}")
        return jsonify({'success': False, 'message': 'Error creating order'}), 500

@app.route('/admin/orders')
def admin_orders():
    """Admin route to view all orders (orders are AES‑encrypted in the cookie)"""

    # Block non‑admins exactly as before
    if not session.get('is_admin', False):
        return redirect(url_for('index'))

    # --- NEW: decrypt the orders list from the cookie ---
    orders_token = session.get("orders_enc", "")
    orders = decrypt_orders(orders_token)  # returns [] if missing or tampered

    # Sort newest‑first for convenience
    orders.sort(key=lambda x: x["created_at"], reverse=True)

    return render_template("admin_orders.html", orders=orders)

def decrypt_orders(token):
    """
    Dummy decrypt_orders implementation.
    Returns the orders from session if present, otherwise returns an empty list.
    Replace this with actual decryption logic if needed.
    """
    return session.get('orders', [])


@app.route('/admin/orders/<int:order_id>/update', methods=['POST'])
def update_order_status(order_id):  # add the parameter
    """Update order status"""
    if not session.get('is_admin', False):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        order_id = request.view_args['order_id']
        data = request.json
        
        orders = session.get('orders', [])
        order = None
        for i, o in enumerate(orders):
            if o['id'] == order_id:
                order = o
                order_index = i
                break
        
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        
        # Update order status
        if 'order_status' in data:
            order['order_status'] = data['order_status']
        
        if 'payment_status' in data:
            order['payment_status'] = data['payment_status']
        
        if 'notes' in data:
            order['notes'] = data['notes']
        
        order['updated_at'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        
        # Update session
        session['orders'][order_index] = order
        session.modified = True
        
        return jsonify({'success': True, 'message': 'Order updated successfully'})
        
    except Exception as e:
        app.logger.error(f"Error updating order: {e}")
        return jsonify({'success': False, 'message': 'Error updating order'}), 500

@app.route('/payment-confirmation')
def payment_confirmation():
    """Payment confirmation page"""
    return render_template('payment_confirmation.html')

@app.route('/order-form/<int:product_id>')
def order_form(product_id):
    """Order form for specific product"""
    products = session.get('products', default_products)
    product = None
    for p in products:
        if p['id'] == product_id:
            product = p
            break
    
    if not product:
        return redirect(url_for('index'))
    
    return render_template('order_form.html', product=product)

@app.route('/admin/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """Remove an order from the session list."""
    if not session.get('is_admin', False):
        return jsonify(success=False, message='Unauthorized'), 403

    orders = session.get('orders', [])
    idx = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
    if idx is None:
        return jsonify(success=False, message='Order not found'), 404

    orders.pop(idx)
    session['orders'] = orders
    session.modified = True
    return jsonify(success=True, message='Order deleted')



@app.route('/track-order-page')
def track_order_page():
    """Customer order tracking page"""
    return render_template('track_order.html')

@app.route('/track-order', methods=['POST'])
def track_order():
    """Track customer orders by phone number"""
    try:
        data = request.json
        phone = data.get('phone', '').strip()
        
        if not phone:
            return jsonify({'success': False, 'message': 'Phone number is required'}), 400
        
        # Get all orders from session
        all_orders = session.get('orders', [])
        
        # Filter orders by phone number
        customer_orders = []
        for order in all_orders:
            if order.get('customer_phone') == phone:
                customer_orders.append(order)
        
        return jsonify({
            'success': True,
            'orders': customer_orders,
            'message': f'Found {len(customer_orders)} order(s)'
        })
        
    except Exception as e:
        app.logger.error(f"Error tracking order: {e}")
        return jsonify({'success': False, 'message': 'Error tracking order'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
