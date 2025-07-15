from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False, default="Premium cookware item")
    price = db.Column(db.Integer, nullable=False)
    image = db.Column(db.String(500), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'image': self.image,
            'stock': self.stock
        }

    def __repr__(self):
        return f'<Product {self.name}>'


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_name = db.Column(db.String(120), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=False)
    customer_email = db.Column(db.String(120))
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    product_name = db.Column(db.String(120), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_amount = db.Column(db.Integer, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    customer_address = db.Column(db.Text)
    notes = db.Column(db.Text)
    upi_transaction_id = db.Column(db.String(120))
    payment_status = db.Column(db.String(50), default="pending")
    order_status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    product = db.relationship('Product', backref='orders')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_email': self.customer_email,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'total_amount': self.total_amount,
            'payment_method': self.payment_method,
            'customer_address': self.customer_address,
            'notes': self.notes,
            'upi_transaction_id': self.upi_transaction_id,
            'payment_status': self.payment_status,
            'order_status': self.order_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Order {self.id} - {self.customer_name}>'
