# ──────────────  IMPORTS  ──────────────
import os, logging, redis, pytz
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for, flash
)
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix

from models import db, Product, Order   # keeps the original db instance

# ──────────────  BASIC CONFIG  ──────────────
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.getenv("SESSION_SECRET", "dev-secret-key-change-in-production")

# ──────────────  SESSION CONFIG  ──────────────
if os.getenv("REDIS_URL"):                       # Render / production
    app.config["SESSION_TYPE"] = "redis"
    app.config["SESSION_REDIS"] = redis.from_url(
        os.environ["REDIS_URL"], decode_responses=True
    )
else:                                            # Local development fallback
    app.config["SESSION_TYPE"] = "filesystem"

app.config["SESSION_PERMANENT"] = False
Session(app)

# ──────────────  DATABASE CONFIG  ──────────────
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///site.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)          # make sure this comes *after* the config

# ──────────────  OTHER GLOBALS  ──────────────
IST = pytz.timezone("Asia/Kolkata")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# .... rest of your routes and logic stay unchanged ....


# ──────────────────  DEFAULT DATA  ──────────────────
DEFAULT_PRODUCTS = [
    dict(
        name="Aluminium Kadhai",
        description="Heavy‑duty and ideal for deep frying and curries.",
        price=599,
        image="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        stock=50
    ),
    dict(
        name="Steel Frying Pan",
        description="Perfect for sautéing and shallow frying.",
        price=449,
        image="https://images.unsplash.com/photo-1592156328757-ae2941276b2c?q=80&w=1170&auto=format&fit=crop",
        stock=30
    ),
    dict(
        name="3‑Piece Cookware Set",
        description="Includes a frying pan, saucepan, and kadhai.",
        price=1199,
        image="https://images.unsplash.com/photo-1556909114-9e59f5a3c13b?w=400&h=300&fit=crop",
        stock=15
    ),
    dict(
        name="Non-Stick Tawa",
        description="Premium non-stick tawa for perfect rotis and dosas.",
        price=299,
        image="https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
        stock=25
    ),
    dict(
        name="Pressure Cooker",
        description="Traditional pressure cooker with copper bottom for superior heat conduction.",
        price=1899,
        image="https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=400&h=300&fit=crop",
        stock=10
    ),
]
PLACEHOLDER_IMG = "https://via.placeholder.com/400x300/6c757d/ffffff?text=Cookware+Item"

with app.app_context():
    # Create database tables
    db.create_all()
    
    # Add default products if none exist
    if Product.query.count() == 0:
        for p in DEFAULT_PRODUCTS:
            db.session.add(Product(**p))
        db.session.commit()
        app.logger.info("Default products added to database")

# ──────────────────  ROUTES  ──────────────────
@app.route("/")
def index():
    try:
        products = [p.to_dict() for p in Product.query.all()]
        return render_template("index.html", products=products)
    except Exception as e:
        app.logger.error(f"Error loading products: {e}")
        return render_template("index.html", products=[], error="Unable to load products")


# ----------  ADMIN AUTH  ----------
@app.route("/admin/login", methods=["POST"])
def admin_login():
    try:
        data = request.get_json()
        code = data.get("code", "").strip() if data else request.form.get("code", "").strip()
        
        if code == "hello abhi":
            session["is_admin"] = True
            session.permanent = True
            return jsonify(success=True, message="Admin login successful")
        return jsonify(success=False, message="Invalid admin code"), 401
    except Exception as e:
        app.logger.error(f"Admin login error: {e}")
        return jsonify(success=False, message="Login failed"), 500


@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    try:
        session.pop("is_admin", None)
        return jsonify(success=True, message="Logged out successfully")
    except Exception as e:
        app.logger.error(f"Admin logout error: {e}")
        return jsonify(success=False, message="Logout failed"), 500


@app.route("/admin/session-check", methods=["GET"])
def admin_session_check():
    return jsonify(is_admin=session.get("is_admin", False), session_data=dict(session))


# ----------  PRODUCT CRUD (ADMIN) ----------
@app.route("/admin/products/update", methods=["POST"])
def update_products():
    app.logger.debug(f"Session data: {dict(session)}")
    if not session.get("is_admin"):
        app.logger.warning("Unauthorized access attempt to product update")
        return jsonify(success=False, message="Unauthorized access"), 403

    try:
        data = request.get_json()
        app.logger.debug(f"Received product update data: {data}")
        
        if not data or "products" not in data:
            return jsonify(success=False, message="Invalid request data"), 400
            
        products_data = data.get("products", [])
        updated_count = 0
        
        # Update existing products and add new ones
        for prod in products_data:
            if prod.get("name") and prod.get("price"):
                try:
                    price = int(prod["price"])
                    stock = int(prod.get("stock", 0))
                    if price <= 0:
                        continue
                    
                    # Check if this is an existing product (has numeric ID) or new product
                    product_id = prod.get("id")
                    if product_id and str(product_id).isdigit():
                        # Update existing product
                        existing_product = Product.query.get(int(product_id))
                        if existing_product:
                            existing_product.name = prod["name"].strip()
                            existing_product.description = prod.get("description", "Premium cookware item").strip()
                            existing_product.price = price
                            existing_product.stock = stock
                            existing_product.image = prod.get("image", PLACEHOLDER_IMG).strip() or PLACEHOLDER_IMG
                            updated_count += 1
                            app.logger.debug(f"Updated product {product_id}: {existing_product.name}")
                    else:
                        # Add new product
                        new_product = Product(
                            name=prod["name"].strip(),
                            description=prod.get("description", "Premium cookware item").strip(),
                            price=price,
                            stock=stock,
                            image=prod.get("image", PLACEHOLDER_IMG).strip() or PLACEHOLDER_IMG,
                        )
                        db.session.add(new_product)
                        updated_count += 1
                        app.logger.debug(f"Added new product: {new_product.name}")
                except (ValueError, TypeError) as e:
                    app.logger.error(f"Error processing product {prod}: {e}")
                    continue
                    
        db.session.commit()
        app.logger.info(f"Successfully updated {updated_count} products")
        return jsonify(success=True, message=f"Products updated successfully ({updated_count} products)")
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating products: {e}")
        return jsonify(success=False, message=f"Error updating products: {str(e)}"), 500


# ----------  ORDER FLOW ----------
@app.route("/order-form/<int:product_id>")
def order_form(product_id):
    try:
        prod = Product.query.get_or_404(product_id)
        return render_template("order_form.html", product=prod.to_dict())
    except Exception as e:
        app.logger.error(f"Error loading order form: {e}")
        flash("Product not found", "error")
        return redirect(url_for("index"))


@app.route("/order/create", methods=["POST"])
def create_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify(success=False, message="Invalid request data"), 400

        # Validate required fields
        required_fields = ["product_id", "customer_name", "customer_phone", "payment_method"]
        for field in required_fields:
            if not data.get(field):
                return jsonify(success=False, message=f"Missing required field: {field}"), 400

        # Validate product exists
        product = Product.query.get(int(data["product_id"]))
        if not product:
            return jsonify(success=False, message="Product not found"), 404

        # Validate quantity
        try:
            qty = int(data.get("quantity", 1))
            if qty <= 0:
                return jsonify(success=False, message="Quantity must be positive"), 400
        except (ValueError, TypeError):
            return jsonify(success=False, message="Invalid quantity"), 400

        # Check stock availability
        if product.stock < qty:
            return jsonify(success=False, message=f"Only {product.stock} items available in stock"), 400

        # Calculate total
        total = product.price * qty

        # Create order with IST timezone
        ist_time = datetime.now(IST)
        order = Order(
            customer_name=data["customer_name"].strip(),
            customer_phone=data["customer_phone"].strip(),
            customer_email=data.get("customer_email", "").strip() or None,
            product_id=product.id,
            product_name=product.name,
            quantity=qty,
            total_amount=total,
            payment_method=data["payment_method"].strip(),
            customer_address=data.get("customer_address", "").strip() or None,
            notes=data.get("notes", "").strip() or None,
            upi_transaction_id=data.get("upi_transaction_id", "").strip() or None,
            created_at=ist_time,
        )
        
        # Deduct stock
        product.stock -= qty
        
        db.session.add(order)
        db.session.commit()

        app.logger.info(f"Order created: ID {order.id}, Customer: {order.customer_name}")
        return jsonify(success=True, order_id=order.id, total_amount=total, message="Order created successfully")
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating order: {e}")
        return jsonify(success=False, message="Error creating order"), 500


# ----------  ADMIN — ORDER DASHBOARD ----------
@app.route("/admin/orders")
def admin_orders():
    if not session.get("is_admin"):
        flash("Please login as admin to access this page", "error")
        return redirect(url_for("index"))

    try:
        orders = [o.to_dict() for o in Order.query.order_by(Order.created_at.desc()).all()]
        products = [p.to_dict() for p in Product.query.all()]
        return render_template("admin_orders.html", orders=orders, products=products)
    except Exception as e:
        app.logger.error(f"Error loading admin orders: {e}")
        return render_template("admin_orders.html", orders=[], products=[], error="Unable to load orders")


# ----------  CUSTOMER ORDER TRACKING ----------
@app.route("/track-order-page")
def track_order_page():
    return render_template("track_order.html")


@app.route("/track-order", methods=["POST"])
def track_order():
    try:
        data = request.get_json()
        phone = data.get("phone", "").strip() if data else ""
        
        if not phone:
            return jsonify(success=False, message="Phone number is required"), 400

        found_orders = Order.query.filter_by(customer_phone=phone).order_by(Order.created_at.desc()).all()
        return jsonify(success=True, orders=[o.to_dict() for o in found_orders])
        
    except Exception as e:
        app.logger.error(f"Error tracking order: {e}")
        return jsonify(success=False, message="Error tracking order"), 500


# ----------  STATIC CONFIRMATION PAGE ----------
@app.route("/payment-confirmation")
def payment_confirmation():
    return render_template("payment_confirmation.html")


# ----------  ADMIN ORDER MANAGEMENT API ----------
@app.route("/admin/orders/<int:order_id>/update", methods=["POST"])
def api_update_order(order_id):
    if not session.get("is_admin"):
        return jsonify(success=False, message="Unauthorized"), 403

    try:
        order = Order.query.get_or_404(order_id)
        data = request.get_json(silent=True) or {}

        # Update allowed fields
        if "payment_status" in data:
            order.payment_status = data["payment_status"]
        if "order_status" in data:
            order.order_status = data["order_status"]
        if "notes" in data:
            order.notes = data["notes"]
            
        order.updated_at = datetime.now(IST)
        db.session.commit()
        
        return jsonify(success=True, message="Order updated successfully")
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating order: {e}")
        return jsonify(success=False, message="Error updating order"), 500


@app.route("/admin/orders/<int:order_id>", methods=["DELETE"])
def api_delete_order(order_id):
    if not session.get("is_admin"):
        return jsonify(success=False, message="Unauthorized"), 403

    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify(success=False, message="Order not found"), 404

        db.session.delete(order)
        db.session.commit()
        return jsonify(success=True, message="Order deleted successfully")
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting order: {e}")
        return jsonify(success=False, message="Error deleting order"), 500


@app.route("/admin/products/<int:prod_id>", methods=["DELETE"])
def api_delete_product(prod_id):
    if not session.get("is_admin"):
        return jsonify(success=False, message="Unauthorized"), 403

    try:
        prod = Product.query.get(prod_id)
        if not prod:
            return jsonify(success=False, message="Product not found"), 404

        db.session.delete(prod)
        db.session.commit()
        return jsonify(success=True, message="Product deleted successfully")
    except IntegrityError:
        db.session.rollback()
        # Example: there are orders referencing this product
        return jsonify(success=False,
                       message="Cannot delete: product has related orders"), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting product: {e}")
        return jsonify(success=False, message="Error deleting product"), 500



@app.route("/admin/orders/<int:order_id>")
def api_get_order(order_id):
    if not session.get("is_admin"):
        return jsonify(success=False, message="Unauthorized"), 403

    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify(success=False, message="Order not found"), 404

        return jsonify(success=True, order=order.to_dict())
    except Exception as e:
        app.logger.error(f"Error getting order: {e}")
        return jsonify(success=False, message="Error retrieving order"), 500


# ──────────────────  ERROR HANDLERS  ──────────────────
@app.errorhandler(404)
def not_found(error):
    return render_template("index.html", error="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template("index.html", error="Internal server error"), 500


# ──────────────────  MAIN  ──────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
