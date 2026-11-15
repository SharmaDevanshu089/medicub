use crate::model::{ReadingChecklist, ReliabilityResult};

pub fn reliability_score(answers: &ReadingChecklist) -> ReliabilityResult {
    let mut score = 0;
    let mut recheck_reasons = Vec::new();

    if answers.seated_supported {
        score += 20;
    } else {
        recheck_reasons
            .push("Ensure seated posture with back supported and feet flat on floor".to_string());
    }

    if answers.rested_5min {
        score += 20;
    } else {
        recheck_reasons.push("Rest quietly for at least 5 minutes before measurement".to_string());
    }

    if answers.arm_heart_level {
        score += 15;
    } else {
        recheck_reasons.push("Support arm at heart level during reading".to_string());
    }

    if answers.no_caffeine_exercise {
        score += 15;
    } else {
        recheck_reasons
            .push("Avoid caffeine, tobacco, or heavy exercise for 30 minutes prior".to_string());
    }

    if answers.correct_cuff_placement {
        score += 10;
    } else {
        recheck_reasons.push("Verify correct cuff size and placement over bare arm".to_string());
    }

    if answers.validated_device {
        score += 10;
    } else {
        recheck_reasons.push(
            "Use a clinically validated upper arm cuff instead of wearable estimation".to_string(),
        );
    }

    if answers.consistent_second_reading {
        score += 10;
    } else {
        recheck_reasons.push("Take a second confirmatory reading 1-2 minutes later".to_string());
    }

    let alert_eligible = score >= 70;

    ReliabilityResult {
        score,
        alert_eligible,
        recheck_reasons,
    }
}
