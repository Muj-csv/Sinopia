"""Phase 0: confirms pytest runs in CI. Real coverage (signature,
ingest filters) lands in Phase 1/2."""


def test_toolchain_runs():
    assert 1 + 1 == 2
