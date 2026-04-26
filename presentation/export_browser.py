#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用浏览器自动化导出高质量 PDF
"""
from playwright.sync_api import sync_playwright
import time

def export_to_pdf():
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=2  # 高分辨率
        )
        page = context.new_page()

        # 访问导出页面
        print('Loading slides...')
        page.goto('http://localhost:3030', wait_until='networkidle')
        time.sleep(3)  # 等待渲染完成

        # 导出 PDF
        print('Exporting PDF...')
        page.pdf(
            path='C:/Users/18153/Desktop/智铸履途_final.pdf',
            format='A4',
            landscape=True,
            print_background=True,
            prefer_css_page_size=True,
            margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
        )

        print('PDF exported successfully!')
        browser.close()

if __name__ == '__main__':
    export_to_pdf()
