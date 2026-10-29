from apscheduler.schedulers.background import BackgroundScheduler

from app.tasks.prediction_refresh import refresh_predictions


scheduler = BackgroundScheduler()


def start_scheduler():
    if scheduler.running:
        return

    scheduler.add_job(
        refresh_predictions,
        "interval",
        minutes=30,
        id="prediction_refresh",
        replace_existing=True,
    )

    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
