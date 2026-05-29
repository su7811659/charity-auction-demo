#!/usr/bin/env python3
"""
Quick script to seed the database with fake data in one command
"""

import subprocess
import sys
import os

def run_command(command):
    """Run a command and return the result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(result.stdout)
            return True
        else:
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def main():
    print("🚀 Quick Database Seeding Script")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists("../database.py"):
        print("❌ Error: Please run this script from the backend/scripts directory")
        sys.exit(1)
    
    # Get number of products from command line or use default
    num_products = 50
    if len(sys.argv) > 1:
        try:
            num_products = int(sys.argv[1])
        except ValueError:
            print("❌ Error: Number of products must be an integer")
            sys.exit(1)
    
    print(f"📦 Creating {num_products} fake products...")
    if not run_command(f"python seed_data.py {num_products}"):
        print("❌ Failed to create products")
        sys.exit(1)
    
    print(f"👍 Adding fake likes and comments...")
    if not run_command("python seed_interactions.py all"):
        print("❌ Failed to add interactions")
        sys.exit(1)
    
    print("✅ Database seeding completed successfully!")
    print("\n📊 Final Statistics:")
    run_command("python seed_interactions.py stats")
    
    print("\n🎉 You can now test your application with realistic data!")
    print("💡 Tip: Use 'python seed_data.py clear' to clear all data if needed")

if __name__ == "__main__":
    main() 