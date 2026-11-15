use crate::model::Gs1;
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum Gs1Error {
    #[error("Empty barcode or string")]
    Empty,
    #[error("Invalid element string")]
    InvalidFormat,
}

pub fn parse_gs1(raw: &str) -> Result<Gs1, Gs1Error> {
    let clean = raw.trim();
    if clean.is_empty() {
        return Err(Gs1Error::Empty);
    }

    // Direct 13-digit EAN-13 or 14-digit GTIN
    if clean.chars().all(|c| c.is_ascii_digit()) && (clean.len() == 13 || clean.len() == 14) {
        return Ok(Gs1 {
            gtin: Some(clean.to_string()),
            batch: None,
            expiry: None,
            serial: None,
        });
    }

    // Parse (01)...(17)...(10)... style GS1 strings
    let mut gtin = None;
    let mut batch = None;
    let mut expiry = None;
    let mut serial = None;

    if clean.contains('(') && clean.contains(')') {
        let parts: Vec<&str> = clean.split('(').collect();
        for part in parts {
            if let Some(close_idx) = part.find(')') {
                let ai = &part[..close_idx];
                let val = &part[close_idx + 1..];
                match ai {
                    "01" => gtin = Some(val.to_string()),
                    "10" => batch = Some(val.to_string()),
                    "17" => expiry = Some(val.to_string()),
                    "21" => serial = Some(val.to_string()),
                    _ => {}
                }
            }
        }
        return Ok(Gs1 {
            gtin,
            batch,
            expiry,
            serial,
        });
    }

    // Fallback: simple text
    Ok(Gs1 {
        gtin: Some(clean.to_string()),
        batch: None,
        expiry: None,
        serial: None,
    })
}
