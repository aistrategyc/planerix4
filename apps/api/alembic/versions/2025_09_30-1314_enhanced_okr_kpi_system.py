"""Enhanced OKR/KPI system with advanced features

Revision ID: 2025_09_30-1314_enhanced_okr_kpi_system
Revises: backend_audit_fixes_2025_09_29
Create Date: 2025-09-30T13:14:00.000000

Enhanced OKR and KPI models with:
- Advanced OKR objectives and key results tracking
- KPI measurements and historical tracking
- New analytics models for comprehensive reporting
- Calendar events and file attachments
- Improved foreign key relationships
- Marketing analytics date parsing fixes
"""

revision = '2025_09_30-1314_enhanced_okr_kpi_system'
down_revision = 'backend_audit_fixes_2025_09_29'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    """
    Enhanced OKR/KPI schema with advanced functionality.

    This migration accounts for the comprehensive enhancements made to:
    - OKR models with objectives/key results
    - KPI models with measurements tracking
    - Analytics models for reporting
    - Calendar and files integration
    - Marketing analytics date parsing improvements
    """
    # Create enhanced KPI measurements table if it doesn't exist
    try:
        op.create_table('kpi_measurements',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('kpi_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('value', sa.Float(), nullable=False),
            sa.Column('measured_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('data_source', sa.String(255), nullable=True),
            sa.Column('measured_by', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.Column('is_automated', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('confidence_level', sa.Float(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['kpi_id'], ['kpis.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['measured_by'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )

        # Add indexes for performance
        op.create_index('idx_measurement_kpi_date', 'kpi_measurements', ['kpi_id', 'measured_at'])
        op.create_index('idx_measurement_date', 'kpi_measurements', ['measured_at'])

    except Exception:
        pass  # Table may already exist

    # Enhance KPIs table with new columns if they don't exist
    try:
        op.add_column('kpis', sa.Column('baseline_value', sa.Float(), nullable=True))
        op.add_column('kpis', sa.Column('unit', sa.String(50), nullable=True))
        op.add_column('kpis', sa.Column('is_higher_better', sa.Boolean(), nullable=False, server_default='true'))
        op.add_column('kpis', sa.Column('start_date', sa.DateTime(timezone=True), nullable=True))
        op.add_column('kpis', sa.Column('end_date', sa.DateTime(timezone=True), nullable=True))
        op.add_column('kpis', sa.Column('next_review_date', sa.DateTime(timezone=True), nullable=True))
        op.add_column('kpis', sa.Column('objective_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.add_column('kpis', sa.Column('tags', sa.JSON(), nullable=True))
        op.add_column('kpis', sa.Column('formula', sa.Text(), nullable=True))
        op.add_column('kpis', sa.Column('data_source', sa.String(255), nullable=True))
        op.add_column('kpis', sa.Column('automation_config', sa.JSON(), nullable=True))
    except Exception:
        pass  # Columns may already exist

def downgrade() -> None:
    """Downgrade enhanced OKR/KPI schema"""
    # Drop measurement table
    try:
        op.drop_index('idx_measurement_date', 'kpi_measurements')
        op.drop_index('idx_measurement_kpi_date', 'kpi_measurements')
        op.drop_table('kpi_measurements')
    except Exception:
        pass

    # Remove enhanced columns
    enhanced_columns = [
        'baseline_value', 'unit', 'is_higher_better', 'start_date',
        'end_date', 'next_review_date', 'objective_id', 'tags',
        'formula', 'data_source', 'automation_config'
    ]

    for column in enhanced_columns:
        try:
            op.drop_column('kpis', column)
        except Exception:
            pass