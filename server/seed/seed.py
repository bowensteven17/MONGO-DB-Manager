# seed.py - MongoDB Database and Collection Seeder
"""
MongoDB Seed Script
Creates sample databases and collections with realistic data for testing MongoDB Explorer
"""

import pymongo
from pymongo import MongoClient
import random
from datetime import datetime, timedelta
import uuid
from faker import Faker
import json

# Initialize Faker for generating realistic data
fake = Faker()

# MongoDB connection settings
MONGO_URI = "mongodb://localhost:27017"
EXCLUDE_SYSTEM_DBS = ['admin', 'config', 'local']

def connect_to_mongodb():
    """Connect to MongoDB and return client"""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info()  # Test connection
        print(f"✅ Connected to MongoDB at {MONGO_URI}")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        exit(1)

def clean_databases(client):
    """Clean existing non-system databases"""
    print("\n🧹 Cleaning existing databases...")
    
    existing_dbs = client.list_database_names()
    user_dbs = [db for db in existing_dbs if db not in EXCLUDE_SYSTEM_DBS]
    
    if not user_dbs:
        print("   No user databases found to clean")
        return
    
    for db_name in user_dbs:
        print(f"   Dropping database: {db_name}")
        client.drop_database(db_name)
    
    print(f"✅ Cleaned {len(user_dbs)} databases")

def generate_user_data(count=50):
    """Generate realistic user data"""
    users = []
    for _ in range(count):
        user = {
            "_id": str(uuid.uuid4()),
            "username": fake.user_name(),
            "email": fake.email(),
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "age": random.randint(18, 80),
            "phone": fake.phone_number(),
            "address": {
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state(),
                "zip_code": fake.zipcode(),
                "country": fake.country()
            },
            "registration_date": fake.date_time_between(start_date='-2y', end_date='now'),
            "is_active": random.choice([True, False]),
            "preferences": {
                "theme": random.choice(['light', 'dark', 'auto']),
                "notifications": random.choice([True, False]),
                "language": random.choice(['en', 'es', 'fr', 'de', 'zh'])
            }
        }
        users.append(user)
    return users

def generate_product_data(count=100):
    """Generate realistic product data"""
    products = []
    categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food', 'Beauty']
    
    for _ in range(count):
        product = {
            "_id": str(uuid.uuid4()),
            "name": fake.catch_phrase(),
            "description": fake.text(max_nb_chars=200),
            "category": random.choice(categories),
            "price": round(random.uniform(5.99, 999.99), 2),
            "currency": "USD",
            "stock_quantity": random.randint(0, 1000),
            "sku": fake.bothify(text='??-####'),
            "brand": fake.company(),
            "rating": round(random.uniform(1.0, 5.0), 1),
            "reviews_count": random.randint(0, 500),
            "created_date": fake.date_time_between(start_date='-1y', end_date='now'),
            "is_featured": random.choice([True, False]),
            "tags": [fake.word() for _ in range(random.randint(2, 6))],
            "dimensions": {
                "length": round(random.uniform(1, 50), 2),
                "width": round(random.uniform(1, 50), 2),
                "height": round(random.uniform(1, 30), 2),
                "weight": round(random.uniform(0.1, 25), 2)
            }
        }
        products.append(product)
    return products

def generate_order_data(count=200):
    """Generate realistic order data"""
    orders = []
    statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
    
    for _ in range(count):
        order = {
            "_id": str(uuid.uuid4()),
            "order_number": fake.bothify(text='ORD-########'),
            "customer_id": str(uuid.uuid4()),
            "order_date": fake.date_time_between(start_date='-6m', end_date='now'),
            "status": random.choice(statuses),
            "items": [
                {
                    "product_id": str(uuid.uuid4()),
                    "product_name": fake.catch_phrase(),
                    "quantity": random.randint(1, 5),
                    "unit_price": round(random.uniform(10, 200), 2)
                } for _ in range(random.randint(1, 4))
            ],
            "shipping_address": {
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state(),
                "zip_code": fake.zipcode(),
                "country": fake.country()
            },
            "payment_method": random.choice(['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']),
            "total_amount": round(random.uniform(25, 500), 2),
            "shipping_cost": round(random.uniform(5, 25), 2),
            "notes": fake.sentence() if random.choice([True, False]) else None
        }
        orders.append(order)
    return orders

def generate_employee_data(count=30):
    """Generate realistic employee data"""
    employees = []
    departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Customer Support']
    positions = ['Manager', 'Senior', 'Junior', 'Lead', 'Director', 'Analyst', 'Specialist']
    
    for _ in range(count):
        employee = {
            "_id": str(uuid.uuid4()),
            "employee_id": fake.bothify(text='EMP-####'),
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.company_email(),
            "department": random.choice(departments),
            "position": f"{random.choice(positions)} {fake.job()}",
            "salary": random.randint(40000, 150000),
            "hire_date": fake.date_time_between(start_date='-5y', end_date='now'),
            "manager_id": str(uuid.uuid4()) if random.choice([True, False]) else None,
            "skills": [fake.word() for _ in range(random.randint(3, 8))],
            "performance_rating": round(random.uniform(2.0, 5.0), 1),
            "is_remote": random.choice([True, False]),
            "contact": {
                "phone": fake.phone_number(),
                "emergency_contact": fake.name(),
                "emergency_phone": fake.phone_number()
            }
        }
        employees.append(employee)
    return employees

def generate_log_data(count=500):
    """Generate realistic log data"""
    logs = []
    log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
    services = ['api-server', 'web-frontend', 'database', 'auth-service', 'payment-service', 'notification-service']
    
    for _ in range(count):
        log = {
            "_id": str(uuid.uuid4()),
            "timestamp": fake.date_time_between(start_date='-30d', end_date='now'),
            "level": random.choice(log_levels),
            "service": random.choice(services),
            "message": fake.sentence(),
            "user_id": str(uuid.uuid4()) if random.choice([True, False]) else None,
            "ip_address": fake.ipv4(),
            "user_agent": fake.user_agent(),
            "request_id": fake.bothify(text='req-########'),
            "duration_ms": random.randint(10, 5000),
            "status_code": random.choice([200, 201, 400, 401, 403, 404, 500, 502]),
            "metadata": {
                "endpoint": fake.uri_path(),
                "method": random.choice(['GET', 'POST', 'PUT', 'DELETE']),
                "response_size": random.randint(100, 10000)
            }
        }
        logs.append(log)
    return logs

def create_database_with_collections(client, db_config):
    """Create a database with specified collections"""
    db_name = db_config['name']
    print(f"\n📂 Creating database: {db_name}")
    
    db = client[db_name]
    
    for collection_config in db_config['collections']:
        collection_name = collection_config['name']
        data_generator = collection_config['generator']
        count = collection_config.get('count', 50)
        
        print(f"   📄 Creating collection: {collection_name} ({count} documents)")
        
        collection = db[collection_name]
        data = data_generator(count)
        
        if data:
            collection.insert_many(data)
            
            # Create indexes for better performance
            if collection_name == 'users':
                collection.create_index([("email", 1)], unique=True, background=True)
                collection.create_index([("username", 1)], unique=True, background=True)
            elif collection_name == 'products':
                collection.create_index([("category", 1), ("price", 1)], background=True)
                collection.create_index([("name", "text"), ("description", "text")], background=True)
            elif collection_name == 'orders':
                collection.create_index([("customer_id", 1), ("order_date", -1)], background=True)
                collection.create_index([("status", 1)], background=True)
            elif collection_name == 'employees':
                collection.create_index([("employee_id", 1)], unique=True, background=True)
                collection.create_index([("department", 1)], background=True)
            elif collection_name == 'logs':
                collection.create_index([("timestamp", -1)], background=True)
                collection.create_index([("level", 1), ("service", 1)], background=True)

def main():
    """Main function to seed the database"""
    print("🌱 MongoDB Seed Script")
    print("=" * 50)
    
    # Connect to MongoDB
    client = connect_to_mongodb()
    
    # Clean existing databases
    clean_databases(client)
    
    # Database configurations
    databases_config = [
        {
            'name': 'ecommerce_store',
            'collections': [
                {'name': 'users', 'generator': generate_user_data, 'count': 100},
                {'name': 'products', 'generator': generate_product_data, 'count': 200},
                {'name': 'orders', 'generator': generate_order_data, 'count': 300},
                {'name': 'reviews', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "product_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "rating": random.randint(1, 5), "comment": fake.text(), "date": fake.date_time_between(start_date='-1y', end_date='now')} for _ in range(n)], 'count': 150}
            ]
        },
        {
            'name': 'company_hr',
            'collections': [
                {'name': 'employees', 'generator': generate_employee_data, 'count': 50},
                {'name': 'departments', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "name": dept, "head_id": str(uuid.uuid4()), "budget": random.randint(100000, 1000000), "location": fake.city()} for dept in ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance']], 'count': 5},
                {'name': 'attendance', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "employee_id": str(uuid.uuid4()), "check_in": fake.time(pattern="%H:%M:%S"), "check_out": fake.time(pattern="%H:%M:%S"), "hours_worked": round(random.uniform(6, 10), 2)} for _ in range(n)], 'count': 200}
            ]
        },
        {
            'name': 'blog_platform',
            'collections': [
                {'name': 'posts', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "title": fake.sentence(), "content": fake.text(max_nb_chars=1000), "author_id": str(uuid.uuid4()), "tags": [fake.word() for _ in range(random.randint(2, 5))], "published_date": fake.date_time_between(start_date='-1y', end_date='now'), "views": random.randint(0, 10000), "likes": random.randint(0, 500)} for _ in range(n)], 'count': 75},
                {'name': 'comments', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "post_id": str(uuid.uuid4()), "author_id": str(uuid.uuid4()), "content": fake.text(max_nb_chars=200), "date": fake.date_time_between(start_date='-6m', end_date='now'), "likes": random.randint(0, 50)} for _ in range(n)], 'count': 200},
                {'name': 'authors', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "name": fake.name(), "email": fake.email(), "bio": fake.text(max_nb_chars=300), "joined_date": fake.date_time_between(start_date='-2y', end_date='now'), "posts_count": random.randint(0, 50)} for _ in range(n)], 'count': 25}
            ]
        },
        {
            'name': 'inventory_system',
            'collections': [
                {'name': 'items', 'generator': generate_product_data, 'count': 150},
                {'name': 'suppliers', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "name": fake.company(), "contact_person": fake.name(), "email": fake.company_email(), "phone": fake.phone_number(), "address": fake.address(), "rating": round(random.uniform(1, 5), 1)} for _ in range(n)], 'count': 20},
                {'name': 'stock_movements', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "item_id": str(uuid.uuid4()), "type": random.choice(['in', 'out', 'adjustment']), "quantity": random.randint(1, 100), "date": fake.date_time_between(start_date='-3m', end_date='now'), "notes": fake.sentence()} for _ in range(n)], 'count': 300}
            ]
        },
        {
            'name': 'event_management',
            'collections': [
                {'name': 'events', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "name": fake.catch_phrase(), "description": fake.text(), "location": fake.address(), "capacity": random.randint(50, 1000), "price": round(random.uniform(10, 200), 2), "organizer_id": str(uuid.uuid4())} for _ in range(n)], 'count': 30},
                {'name': 'registrations', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "event_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "registration_date": fake.date_time_between(start_date='-2m', end_date='now'), "status": random.choice(['confirmed', 'pending', 'cancelled']), "payment_status": random.choice(['paid', 'pending', 'refunded'])} for _ in range(n)], 'count': 200},
                {'name': 'venues', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "name": fake.company(), "address": fake.address(), "capacity": random.randint(50, 2000), "amenities": [fake.word() for _ in range(random.randint(3, 8))], "hourly_rate": round(random.uniform(50, 500), 2)} for _ in range(n)], 'count': 15}
            ]
        },
        {
            'name': 'learning_platform',
            'collections': [
                {'name': 'courses', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "title": fake.catch_phrase(), "description": fake.text(), "instructor_id": str(uuid.uuid4()), "category": random.choice(['Programming', 'Design', 'Business', 'Marketing', 'Data Science']), "duration_hours": random.randint(10, 100), "price": round(random.uniform(29.99, 199.99), 2), "rating": round(random.uniform(3.0, 5.0), 1), "enrolled_count": random.randint(0, 1000)} for _ in range(n)], 'count': 40},
                {'name': 'students', 'generator': generate_user_data, 'count': 80},
                {'name': 'enrollments', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "student_id": str(uuid.uuid4()), "course_id": str(uuid.uuid4()), "enrollment_date": fake.date_time_between(start_date='-6m', end_date='now'), "progress": random.randint(0, 100), "completion_date": fake.date_time_between(start_date='-3m', end_date='now') if random.choice([True, False]) else None} for _ in range(n)], 'count': 150}
            ]
        },
        {
            'name': 'finance_tracker',
            'collections': [
                {'name': 'accounts', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "account_number": fake.bothify(text='ACC-########'), "account_type": random.choice(['checking', 'savings', 'credit', 'investment']), "balance": round(random.uniform(100, 50000), 2), "currency": "USD", "owner_id": str(uuid.uuid4()), "created_date": fake.date_time_between(start_date='-2y', end_date='now')} for _ in range(n)], 'count': 25},
                {'name': 'transactions', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "account_id": str(uuid.uuid4()), "amount": round(random.uniform(-1000, 1000), 2), "description": fake.sentence(), "category": random.choice(['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Income']), "date": fake.date_time_between(start_date='-1y', end_date='now'), "type": random.choice(['debit', 'credit'])} for _ in range(n)], 'count': 400},
                {'name': 'budgets', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "category": random.choice(['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping']), "monthly_limit": round(random.uniform(200, 2000), 2), "current_spent": round(random.uniform(0, 1500), 2), "month": fake.date_time_between(start_date='-12m', end_date='now')} for _ in range(n)], 'count': 60}
            ]
        },
        {
            'name': 'social_media',
            'collections': [
                {'name': 'users', 'generator': generate_user_data, 'count': 120},
                {'name': 'posts', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "content": fake.text(max_nb_chars=280), "timestamp": fake.date_time_between(start_date='-3m', end_date='now'), "likes": random.randint(0, 500), "shares": random.randint(0, 100), "comments_count": random.randint(0, 50)} for _ in range(n)], 'count': 300},
                {'name': 'friendships', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "user1_id": str(uuid.uuid4()), "user2_id": str(uuid.uuid4()), "status": random.choice(['pending', 'accepted', 'blocked']), "created_date": fake.date_time_between(start_date='-1y', end_date='now')} for _ in range(n)], 'count': 200}
            ]
        },
        {
            'name': 'healthcare_system',
            'collections': [
                {'name': 'patients', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "patient_id": fake.bothify(text='P-######'), "first_name": fake.first_name(), "last_name": fake.last_name(), "age": random.randint(18, 80), "gender": random.choice(['Male', 'Female', 'Other']), "phone": fake.phone_number(), "email": fake.email(), "address": fake.address(), "emergency_contact": fake.name(), "blood_type": random.choice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])} for _ in range(n)], 'count': 80},
                {'name': 'appointments', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "patient_id": str(uuid.uuid4()), "doctor_id": str(uuid.uuid4()), "appointment_date": fake.future_datetime(), "reason": fake.sentence(), "status": random.choice(['scheduled', 'completed', 'cancelled', 'no-show']), "notes": fake.text() if random.choice([True, False]) else None} for _ in range(n)], 'count': 150},
                {'name': 'doctors', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "doctor_id": fake.bothify(text='DR-####'), "first_name": fake.first_name(), "last_name": fake.last_name(), "specialization": random.choice(['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology']), "phone": fake.phone_number(), "email": fake.email(), "years_experience": random.randint(1, 30)} for _ in range(n)], 'count': 20}
            ]
        },
        {
            'name': 'system_monitoring',
            'collections': [
                {'name': 'logs', 'generator': generate_log_data, 'count': 1000},
                {'name': 'metrics', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "timestamp": fake.date_time_between(start_date='-7d', end_date='now'), "service": random.choice(['api', 'database', 'frontend', 'cache']), "metric_name": random.choice(['cpu_usage', 'memory_usage', 'disk_usage', 'response_time']), "value": round(random.uniform(0, 100), 2), "unit": random.choice(['%', 'ms', 'MB', 'GB'])} for _ in range(n)], 'count': 500},
                {'name': 'alerts', 'generator': lambda n: [{"_id": str(uuid.uuid4()), "timestamp": fake.date_time_between(start_date='-30d', end_date='now'), "severity": random.choice(['low', 'medium', 'high', 'critical']), "message": fake.sentence(), "service": random.choice(['api', 'database', 'frontend', 'cache']), "status": random.choice(['open', 'acknowledged', 'resolved']), "assigned_to": fake.name() if random.choice([True, False]) else None} for _ in range(n)], 'count': 100}
            ]
        }
    ]
    
    print(f"\n🚀 Creating {len(databases_config)} databases...")
    
    # Create all databases
    for db_config in databases_config:
        create_database_with_collections(client, db_config)
    
    # Display summary
    print(f"\n" + "=" * 50)
    print("✅ Seed script completed successfully!")
    print(f"📊 Created {len(databases_config)} databases with collections")
    
    # Show database summary
    print(f"\n📈 Database Summary:")
    for db_config in databases_config:
        db_name = db_config['name']
        db = client[db_name]
        total_docs = sum(db[col_config['name']].count_documents({}) for col_config in db_config['collections'])
        print(f"   {db_name}: {len(db_config['collections'])} collections, {total_docs:,} documents")
    
    # Close connection
    client.close()
    print(f"\n🔌 Disconnected from MongoDB")

if __name__ == "__main__":
    main()