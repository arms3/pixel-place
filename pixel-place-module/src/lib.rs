use spacetimedb::{table, reducer, Table, ReducerContext, Timestamp, TimeDuration, ScheduleAt, log};

const PIXEL_LIFETIME_MS: i64 = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_INTERVAL_MS: i64 = 1 * 1000; // 1 second

#[table(name = pixel, public)]
pub struct Pixel {
    #[primary_key]
    id: String, // format: "{x}_{y}"
    x: i32,
    y: i32,
    color: String,
    timestamp: Timestamp,
}

#[table(name = cleanup_schedule, scheduled(cleanup_old_pixels))]
pub struct CleanupSchedule {
    /// An identifier for the scheduled reducer call.
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    /// Information about when the reducer should be called.
    scheduled_at: ScheduleAt,
}

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    log::info!("Initializing cleanup schedule");

    // Check if we already have a schedule
    let existing_schedules: Vec<_> = ctx.db.cleanup_schedule().iter().collect();
    if !existing_schedules.is_empty() {
        log::info!("Cleanup schedule already exists, skipping initialization");
        return;
    }

    let interval = TimeDuration::from_micros(CLEANUP_INTERVAL_MS * 1000);
    let loop_duration: TimeDuration = interval;
    
    // Insert the repeating schedule
    ctx.db.cleanup_schedule().insert(CleanupSchedule {
        scheduled_id: 0,
        scheduled_at: loop_duration.into()
    });

    log::info!("Initialized cleanup schedule with interval of {} seconds", CLEANUP_INTERVAL_MS/1000);
}

#[reducer]
fn cleanup_old_pixels(ctx: &ReducerContext, _arg: CleanupSchedule) -> Result<(), String> {
    // Prevent frontend clients from calling this reducer
    if ctx.sender != ctx.identity() {
        return Err("Reducer `scheduled` may not be invoked by clients, only via scheduling.".into());
    }

    let current_time = ctx.timestamp;
    let cutoff_time = current_time - TimeDuration::from_micros(PIXEL_LIFETIME_MS * 1000);
    
    // Find and delete all pixels older than the cutoff time
    let old_pixels: Vec<_> = ctx.db.pixel()
        .iter()
        .filter(|p| p.timestamp < cutoff_time)
        .collect();
    
    let count = old_pixels.len();
    for pixel in old_pixels {
        ctx.db.pixel().delete(pixel);
    }

    // if any pixels were found log the count
    if count > 0 {
        log::info!("Cleanup complete - removed {} pixels", count);
    }
    Ok(())
}

#[reducer]
pub fn set_pixel(ctx: &ReducerContext, x: i32, y: i32, color: String) {
    let id = format!("{}_{}", x, y);
    // Remove any existing pixel at this position
    if let Some(existing) = ctx.db.pixel().iter().find(|p| p.id == id) {
        ctx.db.pixel().delete(existing);
    }
    // Insert the new pixel
    ctx.db.pixel().insert(Pixel {
        id,
        x,
        y,
        color,
        timestamp: ctx.timestamp,
    });
}
