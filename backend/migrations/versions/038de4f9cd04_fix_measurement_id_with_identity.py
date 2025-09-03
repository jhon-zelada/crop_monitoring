"""fix measurement id with identity

Revision ID: 038de4f9cd04
Revises: c546f6bce7c2
Create Date: 2025-09-03 19:47:57.129658

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '038de4f9cd04'
down_revision = 'c546f6bce7c2'
branch_labels = None
depends_on = None


def upgrade():
    # Drop old id column
    op.drop_column("measurements", "id")

    # Add new id column as identity
    op.add_column(
        "measurements",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), primary_key=True)
    )


def downgrade():
    # Drop identity column
    op.drop_column("measurements", "id")

    # Recreate plain BigInteger id without identity
    op.add_column(
        "measurements",
        sa.Column("id", sa.BigInteger(), primary_key=True)

    )