#!/usr/bin/env python3
"""
自動修復腳本 - 檢測並修復常見的配置和相容性問題

這個腳本會：
1. 檢查並修復 Pydantic V2 配置問題
2. 檢查並修復數據庫遷移問題
3. 檢查依賴版本相容性
4. 自動處理常見的開發環境問題

使用方法：
    python scripts/auto_fix.py           # 檢查並修復所有問題
    python scripts/auto_fix.py --check   # 只檢查，不修復
    python scripts/auto_fix.py --pydantic  # 只修復 Pydantic 問題
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Tuple

# 添加父目錄到 Python 路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from utils.logger import Logger
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("auto_fix")

class AutoFixer:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.backend_dir = backend_dir
        self.issues_found = []
        self.fixes_applied = []
        
    def check_pydantic_issues(self) -> List[Tuple[str, str]]:
        """檢查 Pydantic V2 配置問題"""
        print("🔍 檢查 Pydantic V2 配置問題...")
        
        issues = []
        schema_files = list(self.backend_dir.glob("schemas/**/*.py"))
        
        for file_path in schema_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 檢查舊的配置項
                if 'orm_mode = True' in content:
                    issues.append((str(file_path), "使用舊的 orm_mode 配置"))
                
                if 'allow_population_by_field_name = True' in content:
                    issues.append((str(file_path), "使用舊的 allow_population_by_field_name 配置"))
                    
            except Exception as e:
                logger.warning(f"讀取文件失敗 {file_path}: {e}")
        
        if issues:
            print(f"⚠️  發現 {len(issues)} 個 Pydantic 配置問題")
            for file_path, issue in issues:
                rel_path = os.path.relpath(file_path, self.backend_dir)
                print(f"  - {rel_path}: {issue}")
        else:
            print("✅ Pydantic 配置檢查通過")
            
        return issues
    
    def fix_pydantic_issues(self, issues: List[Tuple[str, str]]) -> bool:
        """修復 Pydantic V2 配置問題"""
        if not issues:
            return True
            
        print("🔧 修復 Pydantic V2 配置問題...")
        
        for file_path, issue in issues:
            if self.dry_run:
                print(f"  [DRY RUN] 將修復 {os.path.relpath(file_path, self.backend_dir)}")
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 修復 orm_mode
                if 'orm_mode = True' in content:
                    content = content.replace(
                        'orm_mode = True',
                        'from_attributes = True  # ✅ 取代 orm_mode'
                    )
                
                # 修復 allow_population_by_field_name
                if 'allow_population_by_field_name = True' in content:
                    content = content.replace(
                        'allow_population_by_field_name = True',
                        'populate_by_name = True  # ✅ 取代 allow_population_by_field_name'
                    )
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                rel_path = os.path.relpath(file_path, self.backend_dir)
                print(f"  ✅ 已修復 {rel_path}")
                self.fixes_applied.append(f"Pydantic V2 配置: {rel_path}")
                
            except Exception as e:
                print(f"  ❌ 修復失敗 {file_path}: {e}")
                return False
        
        return True
    
    def check_migration_issues(self) -> List[str]:
        """檢查數據庫遷移問題"""
        print("🔍 檢查數據庫遷移問題...")
        
        issues = []
        
        # 檢查是否有未應用的遷移
        try:
            from scripts.db_manager import DatabaseManager
            db_manager = DatabaseManager()
            
            if not db_manager.check_database_status():
                issues.append("數據庫狀態不一致，需要執行遷移")
        except Exception as e:
            issues.append(f"數據庫檢查失敗: {e}")
        
        if issues:
            print(f"⚠️  發現 {len(issues)} 個數據庫問題")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("✅ 數據庫遷移檢查通過")
            
        return issues
    
    def fix_migration_issues(self, issues: List[str]) -> bool:
        """修復數據庫遷移問題"""
        if not issues:
            return True
            
        print("🔧 修復數據庫遷移問題...")
        
        if self.dry_run:
            print("  [DRY RUN] 將執行數據庫遷移")
            return True
        
        try:
            from scripts.db_manager import DatabaseManager
            db_manager = DatabaseManager()
            
            # 嘗試執行遷移
            if db_manager.run_migrations():
                print("  ✅ 數據庫遷移成功")
                self.fixes_applied.append("數據庫遷移")
                return True
            else:
                print("  ❌ 數據庫遷移失敗")
                return False
        except Exception as e:
            print(f"  ❌ 數據庫遷移失敗: {e}")
            return False
    
    def check_dependency_issues(self) -> List[str]:
        """檢查依賴版本問題"""
        print("🔍 檢查依賴版本...")
        
        issues = []
        requirements_file = self.backend_dir / "requirements.txt"
        
        if not requirements_file.exists():
            issues.append("requirements.txt 文件不存在")
            return issues
        
        try:
            import pkg_resources
            
            with open(requirements_file, 'r') as f:
                requirements = f.read().splitlines()
            
            for req in requirements:
                if req.strip() and not req.startswith('#'):
                    try:
                        pkg_resources.require(req.strip())
                    except pkg_resources.DistributionNotFound:
                        issues.append(f"缺少依賴: {req}")
                    except pkg_resources.VersionConflict as e:
                        issues.append(f"版本衝突: {e}")
        except Exception as e:
            issues.append(f"依賴檢查失敗: {e}")
        
        if issues:
            print(f"⚠️  發現 {len(issues)} 個依賴問題")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("✅ 依賴版本檢查通過")
            
        return issues
    
    def run_full_check(self) -> bool:
        """執行完整檢查和修復"""
        print("🚀 執行完整環境檢查和修復...")
        print("=" * 50)
        
        all_success = True
        
        # 檢查和修復 Pydantic 問題
        pydantic_issues = self.check_pydantic_issues()
        if pydantic_issues and not self.fix_pydantic_issues(pydantic_issues):
            all_success = False
        
        print()
        
        # 檢查和修復數據庫遷移問題
        migration_issues = self.check_migration_issues()
        if migration_issues and not self.fix_migration_issues(migration_issues):
            all_success = False
        
        print()
        
        # 檢查依賴問題
        dependency_issues = self.check_dependency_issues()
        if dependency_issues:
            print("💡 建議執行: pip install -r requirements.txt")
        
        print("=" * 50)
        
        if self.fixes_applied:
            print("✅ 已應用的修復:")
            for fix in self.fixes_applied:
                print(f"  - {fix}")
        else:
            print("✅ 未發現需要修復的問題")
        
        return all_success


def main():
    parser = argparse.ArgumentParser(description="自動檢查和修復環境問題")
    parser.add_argument("--check", action="store_true", help="只檢查，不修復")
    parser.add_argument("--pydantic", action="store_true", help="只修復 Pydantic 問題")
    parser.add_argument("--migration", action="store_true", help="只修復數據庫遷移問題")
    
    args = parser.parse_args()
    
    fixer = AutoFixer(dry_run=args.check)
    
    if args.pydantic:
        issues = fixer.check_pydantic_issues()
        if not args.check and issues:
            fixer.fix_pydantic_issues(issues)
    elif args.migration:
        issues = fixer.check_migration_issues()
        if not args.check and issues:
            fixer.fix_migration_issues(issues)
    else:
        success = fixer.run_full_check()
        if not success:
            sys.exit(1)


if __name__ == "__main__":
    main()
