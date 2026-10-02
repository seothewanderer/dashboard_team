"""화면 공용 가공 데이터(캐시). 여러 화면이 같은 프레임을 쓰게 해 수치를 일치시킨다(plan 1.3-4).
데이터는 data_loader.load_table()로만 읽는다(로컬 DB 전환 대비, plan 6.1)."""
from datetime import date, datetime, timedelta, timezone

import pandas as pd
import streamlit as st

from analytics import companies, jobs, learning, postings
from content.activity_tags import ACTIVITY_BY_MIDDLE
from core.data_loader import load_table

KST = timezone(timedelta(hours=9))


def today() -> date:
    """이용 시점의 한국 날짜 (research 7.2)."""
    return datetime.now(KST).date()


@st.cache_data(show_spinner=False)
def company_frame() -> pd.DataFrame:
    return companies.company_frame(load_table("org"), load_table("org_area"), load_table("defense_evidence"),
                                   load_table("bridge_posting_company_bridge"))


@st.cache_data(show_spinner=False)
def posting_frame() -> pd.DataFrame:
    return postings.posting_frame(load_table("postings"), load_table("bridge_posting_company_bridge"),
                                  company_frame())


@st.cache_data(show_spinner=False)
def job_frame() -> pd.DataFrame:
    return jobs.job_frame(load_table("jobs"), load_table("job_skills"), load_table("job_workplaces"),
                          ACTIVITY_BY_MIDDLE)


@st.cache_data(show_spinner=False)
def offerings_on(day: date) -> pd.DataFrame:
    return learning.with_status(load_table("offerings"), day)


@st.cache_data(show_spinner=False)
def representative_offerings(day: date) -> pd.DataFrame:
    return learning.representative(offerings_on(day))


def job_titles() -> dict[str, str]:
    jf = job_frame()
    return dict(zip(jf["job_id"], jf["job_title_ko"]))
