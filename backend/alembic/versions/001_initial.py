"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "financial_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("default_currency", sa.String(length=3), nullable=False),
        sa.Column("exchange_rate", sa.Float(), nullable=True),
        sa.Column("cok_annual", sa.Float(), nullable=False),
        sa.Column("default_balloon_percent", sa.Float(), nullable=False),
        sa.Column("default_capitalization", sa.Integer(), nullable=False),
        sa.Column("insurance_vehicle_monthly", sa.Float(), nullable=False),
        sa.Column("insurance_life_monthly", sa.Float(), nullable=False),
        sa.Column("commission_rate", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombres", sa.String(length=120), nullable=False),
        sa.Column("apellidos", sa.String(length=120), nullable=False),
        sa.Column("dni", sa.String(length=8), nullable=False),
        sa.Column("edad", sa.Integer(), nullable=False),
        sa.Column("ingreso_mensual", sa.Float(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("telefono", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customers_dni"), "customers", ["dni"], unique=True)
    op.create_index(op.f("ix_customers_id"), "customers", ["id"], unique=False)

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=40), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vehicles_id"), "vehicles", ["id"], unique=False)

    op.create_table(
        "simulations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("vehicle_price", sa.Float(), nullable=False),
        sa.Column("down_payment", sa.Float(), nullable=False),
        sa.Column("amount_financed", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("rate_type", sa.String(length=20), nullable=False),
        sa.Column("rate_value", sa.Float(), nullable=False),
        sa.Column("capitalization", sa.Integer(), nullable=True),
        sa.Column("tea", sa.Float(), nullable=False),
        sa.Column("tem", sa.Float(), nullable=False),
        sa.Column("grace_type", sa.String(length=20), nullable=False),
        sa.Column("grace_months", sa.Integer(), nullable=False),
        sa.Column("term_months", sa.Integer(), nullable=False),
        sa.Column("balloon_percent", sa.Float(), nullable=False),
        sa.Column("balloon_amount", sa.Float(), nullable=False),
        sa.Column("monthly_payment", sa.Float(), nullable=False),
        sa.Column("insurance_vehicle", sa.Float(), nullable=False),
        sa.Column("insurance_life", sa.Float(), nullable=False),
        sa.Column("commission", sa.Float(), nullable=False),
        sa.Column("van", sa.Float(), nullable=True),
        sa.Column("tir_monthly", sa.Float(), nullable=True),
        sa.Column("tcea", sa.Float(), nullable=True),
        sa.Column("total_interest", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_simulations_code"), "simulations", ["code"], unique=True)
    op.create_index(op.f("ix_simulations_id"), "simulations", ["id"], unique=False)

    op.create_table(
        "payment_schedule",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("simulation_id", sa.Integer(), nullable=False),
        sa.Column("period", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("opening_balance", sa.Float(), nullable=False),
        sa.Column("interest", sa.Float(), nullable=False),
        sa.Column("amortization", sa.Float(), nullable=False),
        sa.Column("insurance_vehicle", sa.Float(), nullable=False),
        sa.Column("insurance_life", sa.Float(), nullable=False),
        sa.Column("payment", sa.Float(), nullable=False),
        sa.Column("balloon_payment", sa.Float(), nullable=False),
        sa.Column("closing_balance", sa.Float(), nullable=False),
        sa.Column("is_grace_period", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["simulation_id"], ["simulations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payment_schedule_id"), "payment_schedule", ["id"], unique=False)

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("simulation_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("analyst_id", sa.Integer(), nullable=True),
        sa.Column("approved_amount", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["analyst_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["simulation_id"], ["simulations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_applications_id"), "applications", ["id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("previous_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("applications")
    op.drop_table("payment_schedule")
    op.drop_table("simulations")
    op.drop_table("vehicles")
    op.drop_table("customers")
    op.drop_table("financial_settings")
    op.drop_table("users")
