from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier


CATEGORICAL_FEATURES = [
    "department",
    "maintenance_type",
    "section",
    "weather_condition"
]

NUMERICAL_FEATURES = [
    "planned_duration_hours",
    "complexity_score",
    "crew_experience_level",
    "crew_size_allocated",
    "crew_shortage_ratio",
    "equipment_age_years",
    "is_night_shift",
    "dependency_count",
    "historical_section_delay_rate"
]

ALL_FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
TARGET_COLUMN = "is_delayed"


def build_ml_pipeline() -> Pipeline:
    """
    Builds a robust, production-style scikit-learn Pipeline with:
    - OneHotEncoding with unknown-handling for categorical variables
    - StandardScaler for numerical variables
    - Random Forest Classifier with balanced class weights and restrained depth to avoid overfitting.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES
            ),
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES
            )
        ],
        remainder="drop"
    )

    rf_classifier = RandomForestClassifier(
        n_estimators=120,
        max_depth=9,
        min_samples_split=6,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", rf_classifier)
        ]
    )

    return pipeline
