from math import atan2, cos, radians, sin, sqrt


def calculate_distance_km(
    latitude_1,
    longitude_1,
    latitude_2,
    longitude_2,
):
    earth_radius = 6371.0

    lat1 = radians(latitude_1)
    lat2 = radians(latitude_2)

    delta_lat = radians(latitude_2 - latitude_1)
    delta_lon = radians(longitude_2 - longitude_1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    return earth_radius * c


def calculate_parking_score(
    distance_km,
    predicted_occupancy,
    price_per_hour,
    max_price_per_hour=200.0,
):
    distance_score = max(
        0.0,
        1.0 - (distance_km / 10.0),
    )

    availability_score = max(
        0.0,
        1.0 - predicted_occupancy,
    )

    price_score = max(
        0.0,
        1.0 - (
            price_per_hour
            / max_price_per_hour
        ),
    )

    score = (
        distance_score * 0.40
        + availability_score * 0.40
        + price_score * 0.20
    )

    return round(score * 100, 2)


def rank_parking_options(options):
    ranked = []

    for option in options:
        score = calculate_parking_score(
            distance_km=option["distance_km"],
            predicted_occupancy=option[
                "predicted_occupancy"
            ],
            price_per_hour=option[
                "price_per_hour"
            ],
        )

        ranked.append(
            {
                **option,
                "recommendation_score": score,
            }
        )

    return sorted(
        ranked,
        key=lambda item: item[
            "recommendation_score"
        ],
        reverse=True,
    )
