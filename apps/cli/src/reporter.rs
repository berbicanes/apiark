use crate::models::RunSummary;

/// Output summary as JSON.
pub fn report_json(summary: &RunSummary) -> anyhow::Result<String> {
    Ok(serde_json::to_string_pretty(summary)?)
}

/// Output summary as JUnit XML.
pub fn report_junit(summary: &RunSummary) -> String {
    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str(&format!(
        "<testsuites tests=\"{}\" failures=\"{}\" time=\"{:.3}\">\n",
        summary.total_requests,
        summary.total_failed,
        summary.total_time_ms as f64 / 1000.0
    ));

    for iteration in &summary.iterations {
        xml.push_str(&format!(
            "  <testsuite name=\"Iteration {}\" tests=\"{}\">\n",
            iteration.iteration,
            iteration.results.len()
        ));

        for result in &iteration.results {
            let time_s = result.time_ms.unwrap_or(0) as f64 / 1000.0;
            xml.push_str(&format!(
                "    <testcase name=\"{} {}\" time=\"{:.3}\"",
                escape_xml(&result.method),
                escape_xml(&result.name),
                time_s
            ));

            if result.passed {
                xml.push_str(" />\n");
            } else {
                xml.push_str(">\n");
                let msg = result.error.as_deref().unwrap_or("Request failed");
                xml.push_str(&format!(
                    "      <failure message=\"{}\">{}</failure>\n",
                    escape_xml(msg),
                    escape_xml(msg)
                ));
                xml.push_str("    </testcase>\n");
            }
        }

        xml.push_str("  </testsuite>\n");
    }

    xml.push_str("</testsuites>\n");
    xml
}

/// Output summary as HTML report.
pub fn report_html(summary: &RunSummary) -> String {
    let pass_pct = if summary.total_requests > 0 {
        (summary.total_passed as f64 / summary.total_requests as f64 * 100.0) as u32
    } else {
        0
    };

    let mut html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ApiArk Run Report</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; background: #0a0a0b; color: #e4e4e7; }}
h1 {{ color: #3b82f6; }}
.summary {{ display: flex; gap: 2rem; margin: 1.5rem 0; }}
.stat {{ background: #141416; padding: 1rem 1.5rem; border-radius: 8px; }}
.stat .value {{ font-size: 1.5rem; font-weight: bold; }}
.pass {{ color: #22c55e; }}
.fail {{ color: #ef4444; }}
table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
th, td {{ text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #2a2a2e; }}
th {{ background: #141416; }}
.status-2xx {{ color: #22c55e; }}
.status-3xx {{ color: #eab308; }}
.status-4xx {{ color: #ef4444; }}
.status-5xx {{ color: #ef4444; }}
</style>
</head>
<body>
<h1>ApiArk Run Report</h1>
<div class="summary">
  <div class="stat"><div class="value">{}</div>Total</div>
  <div class="stat"><div class="value pass">{}</div>Passed</div>
  <div class="stat"><div class="value fail">{}</div>Failed</div>
  <div class="stat"><div class="value">{pass_pct}%</div>Pass Rate</div>
  <div class="stat"><div class="value">{}ms</div>Total Time</div>
</div>
"#,
        summary.total_requests, summary.total_passed, summary.total_failed, summary.total_time_ms
    );

    for iteration in &summary.iterations {
        html.push_str(&format!(
            "<h2>Iteration {}</h2>\n<table>\n",
            iteration.iteration
        ));
        html.push_str(
            "<tr><th>Status</th><th>Method</th><th>Name</th><th>Time</th><th>Result</th></tr>\n",
        );

        for r in &iteration.results {
            let status_class = match r.status {
                Some(s) if s < 300 => "status-2xx",
                Some(s) if s < 400 => "status-3xx",
                Some(s) if s < 500 => "status-4xx",
                _ => "status-5xx",
            };
            let status = r.status.map(|s| s.to_string()).unwrap_or("ERR".into());
            let result_class = if r.passed { "pass" } else { "fail" };
            let result_text = if r.passed { "PASS" } else { "FAIL" };
            let time = r.time_ms.map(|t| format!("{t}ms")).unwrap_or_default();

            html.push_str(&format!(
                "<tr><td class=\"{status_class}\">{status}</td><td>{}</td><td>{}</td><td>{time}</td><td class=\"{result_class}\">{result_text}</td></tr>\n",
                escape_html(&r.method),
                escape_html(&r.name),
            ));
        }

        html.push_str("</table>\n");
    }

    html.push_str("</body>\n</html>\n");
    html
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
