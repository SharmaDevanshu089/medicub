use crate::model::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Audience {
    Clinician,
    Patient,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    Hi,
}

pub fn explain(flag: &Flag, audience: Audience, lang: Lang) -> String {
    match (audience, lang) {
        (Audience::Clinician, _) => flag.explain_clinician_en.clone(),
        (Audience::Patient, Lang::En) => flag.explain_patient_en.clone(),
        (Audience::Patient, Lang::Hi) => flag.explain_patient_hi.clone(),
    }
}
