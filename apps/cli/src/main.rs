mod collection;
mod interpolation;
mod models;
mod reporter;
mod runner;

use std::path::PathBuf;

use clap::Parser;
use colored::Colorize;

#[derive(Parser)]
#[command(
    name = "apiark",
    version,
    about = "ApiArk CLI — run API collections from the command line"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(clap::Subcommand)]
enum Commands {
    /// Run a collection or folder
    Run {
        /// Path to the collection directory
        collection: String,

        /// Environment name
        #[arg(short, long)]
        env: Option<String>,

        /// Delay between requests in milliseconds
        #[arg(short, long, default_value = "0")]
        delay: u64,

        /// Number of iterations
        #[arg(short, long, default_value = "1")]
        iterations: u32,

        /// Data file for data-driven testing (CSV, JSON, YAML)
        #[arg(long)]
        data: Option<String>,

        /// Reporter format: cli (default), json, junit, html
        #[arg(short, long, default_value = "cli")]
        reporter: String,

        /// Output file for reporter (stdout if not specified)
        #[arg(short, long)]
        output: Option<String>,
    },

    /// Import a collection from another format
    Import {
        /// Path to the file to import
        file: String,

        /// Target directory for the imported collection
        #[arg(short, long)]
        output: Option<String>,

        /// Source format: postman, insomnia, openapi (auto-detected if omitted)
        #[arg(short, long)]
        format: Option<String>,
    },

    /// Export a collection to another format
    Export {
        /// Path to the collection directory
        collection: String,

        /// Export format: postman, openapi
        #[arg(short, long)]
        format: String,

        /// Output file path
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Run {
            collection,
            env,
            delay,
            iterations,
            data,
            reporter,
            output,
        } => {
            let path = PathBuf::from(&collection)
                .canonicalize()
                .map_err(|e| anyhow::anyhow!("Collection path not found: {collection}: {e}"))?;

            let config = collection::load_config(&path)?;
            println!("{} {}", "Running:".bold(), config.name);

            if let Some(ref env_name) = env {
                println!("{} {}", "Environment:".bold(), env_name);
            }

            let summary =
                runner::run_collection(&path, env.as_deref(), delay, iterations, data.as_deref())
                    .await?;

            // Print summary line
            println!();
            let pass_color = if summary.total_failed == 0 {
                format!("{} passed", summary.total_passed).green()
            } else {
                format!("{} passed", summary.total_passed).yellow()
            };
            let fail_color = if summary.total_failed > 0 {
                format!("{} failed", summary.total_failed).red()
            } else {
                format!("{} failed", summary.total_failed).green()
            };
            println!(
                "{} {} requests: {}, {} ({}ms)",
                "Summary:".bold(),
                summary.total_requests,
                pass_color,
                fail_color,
                summary.total_time_ms
            );

            // Output report
            match reporter.as_str() {
                "json" => {
                    let json = reporter::report_json(&summary)?;
                    write_output(&json, output.as_deref())?;
                }
                "junit" => {
                    let xml = reporter::report_junit(&summary);
                    write_output(&xml, output.as_deref())?;
                }
                "html" => {
                    let html = reporter::report_html(&summary);
                    write_output(&html, output.as_deref())?;
                }
                "cli" => {} // Already printed above
                other => {
                    eprintln!("Unknown reporter: {other}. Using cli.");
                }
            }

            // Exit code: 0 = all pass, 1 = failures
            if summary.total_failed > 0 {
                std::process::exit(1);
            }
        }

        Commands::Import {
            file,
            output,
            format,
        } => {
            // Import is a complex operation that shares logic with the desktop app.
            // For now, provide a helpful message pointing to the desktop app.
            let fmt = format.as_deref().unwrap_or("auto");
            let out = output.as_deref().unwrap_or("./");
            println!("{} {}", "Import:".bold(), file);
            println!("  Format: {fmt}");
            println!("  Output: {out}");
            println!();
            println!(
                "{}",
                "Import from CLI is not yet implemented. Use the desktop app to import collections."
                    .yellow()
            );
            println!("Supported formats: postman, insomnia, bruno, openapi");
        }

        Commands::Export {
            collection,
            format,
            output,
        } => {
            let out = output.as_deref().unwrap_or("-");
            println!("{} {}", "Export:".bold(), collection);
            println!("  Format: {format}");
            println!("  Output: {out}");
            println!();
            println!(
                "{}",
                "Export from CLI is not yet implemented. Use the desktop app to export collections."
                    .yellow()
            );
            println!("Supported formats: postman, openapi");
        }
    }

    Ok(())
}

fn write_output(content: &str, path: Option<&str>) -> anyhow::Result<()> {
    match path {
        Some(p) => {
            std::fs::write(p, content)?;
            println!("Report written to: {p}");
        }
        None => {
            println!("{content}");
        }
    }
    Ok(())
}
