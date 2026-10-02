"""관계표 초안 규칙 (plan.md 3.5, 6.5, research 10.2)."""
import pandas as pd
import pytest

from core.data_loader import read_table
from scripts import draft_bridges
from scripts.build_data import check_contracts


def test_all_rows_have_valid_status():
    for name in ["posting_company_bridge", "company_identity_bridge", "application_job_bridge",
                 "job_posting_category_bridge", "skill_dictionary"]:
        status = read_table(f"bridge_{name}")["review_status"]
        assert status.isin({"draft", "reviewed", "rejected"}).all(), name


def test_posting_company_one_row_per_posting_and_unlinked_kept():
    b = read_table("bridge_posting_company_bridge")
    assert len(b) == 135 and b["posting_id"].is_unique
    assert (b["match_method"] == "exact_name").sum() == 52
    assert b["company_id"].isna().sum() > 0  # 미연결 공고는 지우지 않고 남긴다


def test_lig_mapping_is_source_limited():
    # CMP0003→CMP0002 는 DART 목록 행에서만. 전역 치환 금지(research 10.3-2)
    ident = read_table("bridge_company_identity_bridge")
    lig = ident[ident["source_id"] == "CMP0003"]
    assert lig["company_id"].tolist() == ["CMP0002"]
    assert "CMP0003" not in set(read_table("org")["company_id"])


def test_contract_rejects_unknown_status():
    tables = {"bridge_x": pd.DataFrame({"review_status": ["draft", "approved"]})}
    base = {n: read_table(n) for n in ["jobs", "job_skills", "skill_resources", "courses", "offerings", "postings",
                                       "org", "ntis_projects", "defense_evidence", "org_area", "job_workplaces",
                                       "job_employer_examples", "job_posting_examples"]}
    assert any("review_status" in f for f in check_contracts(base | tables))


@pytest.mark.parametrize("a,b,same", [("C++", "c++", True), ("C++", "C/C++", False), ("ROS", "ROS2", False),
                                      ("Point Cloud", "point-cloud", True), ("DJI Terra", "DJI TERRA", True)])
def test_skill_normalization_keeps_meaningful_differences(a, b, same):
    assert (draft_bridges.norm_skill(a) == draft_bridges.norm_skill(b)) is same


def test_name_normalization():
    assert draft_bridges.norm_name("지오랩스(주)") == draft_bridges.norm_name("지오랩스")
    assert draft_bridges.norm_name("㈜ 가이온") == draft_bridges.norm_name("가이온")


def test_draft_script_does_not_overwrite_reviewed_files(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(draft_bridges, "BRIDGES", tmp_path)
    monkeypatch.setattr("sys.argv", ["draft_bridges.py"])
    for name in ["posting_company_bridge", "company_identity_bridge", "application_job_bridge",
                 "job_posting_category_bridge", "skill_dictionary"]:
        (tmp_path / f"{name}.csv").write_text("reviewed-by-user", encoding="utf-8")
    draft_bridges.main()
    assert all(p.read_text(encoding="utf-8") == "reviewed-by-user" for p in tmp_path.glob("*.csv"))
    assert capsys.readouterr().out.count("건너뜀") == 5
