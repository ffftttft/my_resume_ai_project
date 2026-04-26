"""Real Tavily API test with actual API key."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.job_search_service import JobSearchService


def test_real_tavily_search():
    """Test real Tavily API search."""

    print("=" * 60)
    print("真实 Tavily API 测试")
    print("=" * 60)

    service = JobSearchService(
        api_key="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",
        enabled=True
    )

    print(f"\nService Status:")
    print(f"  - Enabled: {service.enabled}")
    print(f"  - Is Available: {service.is_available}")

    # Test 1: 字节跳动后端开发
    print("\n" + "=" * 60)
    print("测试 1: 字节跳动 + 后端开发工程师")
    print("=" * 60)

    result = service.search(
        target_company="字节跳动",
        target_role="后端开发工程师",
        job_requirements="Python、Go、分布式系统"
    )

    print(f"\nQuery: {result['query']}")
    print(f"Mode: {result['mode']}")
    print(f"Provider: {result['provider']}")
    print(f"Cached: {result['cached']}")
    print(f"Results Count: {len(result['results'])}")

    if result['warning']:
        print(f"Warning: {result['warning']}")

    if result['results']:
        print(f"\nTop Results:")
        for i, item in enumerate(result['results'][:3], 1):
            print(f"\n  [{i}] {item['title']}")
            print(f"      URL: {item['url']}")
            print(f"      Source: {item['source']}")
            print(f"      Score: {item['score']}")
            print(f"      Snippet: {item['snippet'][:100]}...")

    # Test 2: 阿里巴巴算法工程师
    print("\n" + "=" * 60)
    print("测试 2: 阿里巴巴 + 算法工程师")
    print("=" * 60)

    result2 = service.search(
        target_company="阿里巴巴",
        target_role="算法工程师",
        job_requirements="机器学习、深度学习"
    )

    print(f"\nQuery: {result2['query']}")
    print(f"Mode: {result2['mode']}")
    print(f"Results Count: {len(result2['results'])}")

    if result2['results']:
        print(f"\nTop Result:")
        item = result2['results'][0]
        print(f"  Title: {item['title']}")
        print(f"  URL: {item['url']}")
        print(f"  Source: {item['source']}")

    print("\n" + "=" * 60)
    print("测试完成！联网搜索功能真实可用！")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_real_tavily_search()
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
