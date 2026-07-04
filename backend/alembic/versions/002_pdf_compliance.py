"""pdf compliance - catalog tables and missing fields

Revision ID: 002
Revises: 001
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "currency_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=3), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("symbol", sa.String(length=5), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "interest_rate_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "grace_period_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "payment_statuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "financieras",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
    )

    op.bulk_insert(
        sa.table("currency_types", sa.column("id", sa.Integer), sa.column("code", sa.String), sa.column("name", sa.String), sa.column("symbol", sa.String)),
        [
            {"id": 1, "code": "PEN", "name": "Soles", "symbol": "S/"},
            {"id": 2, "code": "USD", "name": "Dólares", "symbol": "$"},
        ],
    )
    op.bulk_insert(
        sa.table("interest_rate_types", sa.column("id", sa.Integer), sa.column("code", sa.String), sa.column("name", sa.String)),
        [
            {"id": 1, "code": "TEA", "name": "Tasa Efectiva Anual"},
            {"id": 2, "code": "TNA", "name": "Tasa Nominal Anual"},
        ],
    )
    op.bulk_insert(
        sa.table("grace_period_types", sa.column("id", sa.Integer), sa.column("code", sa.String), sa.column("name", sa.String)),
        [
            {"id": 1, "code": "none", "name": "Sin gracia"},
            {"id": 2, "code": "partial", "name": "Gracia parcial"},
            {"id": 3, "code": "total", "name": "Gracia total"},
        ],
    )
    op.bulk_insert(
        sa.table("payment_statuses", sa.column("id", sa.Integer), sa.column("code", sa.String), sa.column("name", sa.String)),
        [
            {"id": 1, "code": "pending", "name": "Pendiente"},
            {"id": 2, "code": "paid", "name": "Pagado"},
            {"id": 3, "code": "overdue", "name": "Vencido"},
        ],
    )
    op.bulk_insert(
        sa.table("financieras", sa.column("id", sa.Integer), sa.column("name", sa.String)),
        [
            {"id": 1, "name": "BCP"},
            {"id": 2, "name": "BBVA"},
            {"id": 3, "name": "Interbank"},
            {"id": 4, "name": "Scotiabank"},
        ],
    )

    op.add_column("customers", sa.Column("direccion", sa.String(length=255), server_default="", nullable=False))
    op.add_column("customers", sa.Column("esta_trabajando", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("customers", sa.Column("es_dependiente", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    op.add_column("financial_settings", sa.Column("dealership_name", sa.String(length=200), server_default="AutoFinance Pro Concesionaria", nullable=False))
    op.add_column("financial_settings", sa.Column("dealership_ruc", sa.String(length=11), server_default="20123456789", nullable=False))
    op.add_column("financial_settings", sa.Column("dealership_email", sa.String(length=255), server_default="contacto@autofinance.pro", nullable=False))
    op.add_column("financial_settings", sa.Column("portes_monthly", sa.Float(), server_default="10.0", nullable=False))

    op.add_column("simulations", sa.Column("disbursement_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("simulations", sa.Column("financiera_id", sa.Integer(), nullable=True))
    op.add_column("simulations", sa.Column("include_insurance_vehicle", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("simulations", sa.Column("include_insurance_life", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("simulations", sa.Column("portes", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("simulations", sa.Column("balloon_base", sa.String(length=20), server_default="vehicle", nullable=False))
    op.create_foreign_key("fk_simulations_financiera", "simulations", "financieras", ["financiera_id"], ["id"])

    op.add_column("payment_schedule", sa.Column("portes", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("payment_schedule", sa.Column("payment_status_id", sa.Integer(), server_default="1", nullable=False))
    op.create_foreign_key("fk_payment_schedule_status", "payment_schedule", "payment_statuses", ["payment_status_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_payment_schedule_status", "payment_schedule", type_="foreignkey")
    op.drop_column("payment_schedule", "payment_status_id")
    op.drop_column("payment_schedule", "portes")
    op.drop_constraint("fk_simulations_financiera", "simulations", type_="foreignkey")
    op.drop_column("simulations", "balloon_base")
    op.drop_column("simulations", "portes")
    op.drop_column("simulations", "include_insurance_life")
    op.drop_column("simulations", "include_insurance_vehicle")
    op.drop_column("simulations", "financiera_id")
    op.drop_column("simulations", "disbursement_date")
    op.drop_column("financial_settings", "portes_monthly")
    op.drop_column("financial_settings", "dealership_email")
    op.drop_column("financial_settings", "dealership_ruc")
    op.drop_column("financial_settings", "dealership_name")
    op.drop_column("customers", "es_dependiente")
    op.drop_column("customers", "esta_trabajando")
    op.drop_column("customers", "direccion")
    op.drop_table("financieras")
    op.drop_table("payment_statuses")
    op.drop_table("grace_period_types")
    op.drop_table("interest_rate_types")
    op.drop_table("currency_types")
