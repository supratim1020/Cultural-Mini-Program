#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户数据库初始化脚本
"""

import sqlite3
import os
import hashlib

def init_user_db():
    """初始化用户数据库"""
    # 数据库文件路径
    db_path = os.path.join('backend', 'app', 'web', 'users.db')
    
    print(f"正在初始化用户数据库: {db_path}")
    
    # 确保目录存在
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 创建用户表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 检查是否已存在默认用户
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
        admin_exists = cursor.fetchone()[0] > 0
        
        if not admin_exists:
            # 插入默认用户
            default_users = [
                ('admin', '123456'),
                ('user1', 'password123'),
                ('operator', 'operator123')
            ]
            
            for username, password in default_users:
                hashed_password = hashlib.sha256(password.encode('utf-8')).hexdigest()
                cursor.execute(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    (username, hashed_password)
                )
                print(f"已创建用户: {username}")
        
        # 提交更改
        conn.commit()
        
        # 显示所有用户
        cursor.execute("SELECT username, created_at FROM users")
        users = cursor.fetchall()
        
        print(f"\n数据库初始化完成！")
        print(f"当前用户列表:")
        for username, created_at in users:
            print(f"  - {username} (创建时间: {created_at})")
        
        print(f"\n默认登录信息:")
        print(f"  用户名: admin")
        print(f"  密码: 123456")
        
    except sqlite3.Error as e:
        print(f"数据库操作错误: {e}")
        conn.rollback()
    except Exception as e:
        print(f"初始化失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=== 用户数据库初始化工具 ===\n")
    init_user_db()
    print("\n=== 初始化完成 ===") 