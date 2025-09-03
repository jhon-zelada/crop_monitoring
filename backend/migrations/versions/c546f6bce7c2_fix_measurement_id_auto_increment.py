"""fix measurement id auto increment

Revision ID: c546f6bce7c2
Revises: dc29f44d279d
Create Date: 2025-09-03 19:43:52.539851

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c546f6bce7c2'
down_revision = 'dc29f44d279d'
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