"""enhance kpi system with measurements and bindings

Revision ID: 2025_10_16_enhance_kpi
Revises: 2025_10_15_1510_create_calendar_tables
Create Date: 2025-10-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_10_16_enhance_kpi'
down_revision = '2025_10_15_1510_create_calendar_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Enhance KPI system:
    1. Rename table 'kpis' → 'kpi_indicators'
    2. Add new columns to kpi_indicators
    3. Create kpi_measurements table
    4. Create metric_bindings table
    5. Create indexes
    """

    # ============================================================================
    # Step 1: Rename table 'kpis' to 'kpi_indicators'
    # ============================================================================
    op.rename_table('kpis', 'kpi_indicators')

    # Rename indexes
    op.execute("ALTER INDEX IF EXISTS ix_kpis_org_id RENAME TO ix_kpi_indicators_org_id")
    op.execute("ALTER INDEX IF EXISTS kpis_pkey RENAME TO kpi_indicators_pkey")

    # Rename foreign key constraints
    op.execute("""
        ALTER TABLE kpi_indicators
        DROP CONSTRAINT IF EXISTS kpis_org_id_fkey;
    """)
    op.create_foreign_key(
        'kpi_indicators_org_id_fkey',
        'kpi_indicators',
        'organizations',
        ['org_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # ============================================================================
    # Step 2: Add new columns to kpi_indicators
    # ============================================================================

    # Values and thresholds
    op.add_column('kpi_indicators', sa.Column('baseline_value', sa.Float(), nullable=True))
    op.add_column('kpi_indicators', sa.Column('warn_threshold', sa.Float(), nullable=True))
    op.add_column('kpi_indicators', sa.Column('alarm_threshold', sa.Float(), nullable=True))

    # Data source configuration
    op.add_column('kpi_indicators', sa.Column('source_type', sa.String(50), nullable=False, server_default='manual'))
    op.add_column('kpi_indicators', sa.Column('formula', sa.Text(), nullable=True))
    op.add_column('kpi_indicators', sa.Column('formula_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # KPI type and period
    op.add_column('kpi_indicators', sa.Column('kpi_type', sa.String(50), nullable=False, server_default='gauge'))
    op.add_column('kpi_indicators', sa.Column('period', sa.String(50), nullable=False, server_default='monthly'))
    op.add_column('kpi_indicators', sa.Column('aggregation', sa.String(50), nullable=True, server_default='last'))

    # Status tracking (rename on_track to status for clarity)
    op.add_column('kpi_indicators', sa.Column('status', sa.String(50), nullable=False, server_default='on_track'))
    # Keep old 'on_track' column for backward compatibility (will be deprecated)

    # Relationships
    op.add_column('kpi_indicators', sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('kpi_indicators', sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Last update tracking
    op.add_column('kpi_indicators', sa.Column('last_measured_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('kpi_indicators', sa.Column('next_review_date', sa.DateTime(timezone=True), nullable=True))

    # Metadata
    op.add_column('kpi_indicators', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'))

    # Change description column type from VARCHAR(1024) to TEXT
    op.alter_column('kpi_indicators', 'description',
                    existing_type=sa.String(1024),
                    type_=sa.Text(),
                    existing_nullable=True)

    # Make current_value nullable (can be null if no measurements yet)
    op.alter_column('kpi_indicators', 'current_value',
                    existing_type=sa.Float(),
                    nullable=True,
                    server_default='0.0')

    # Add foreign keys for new relationships
    op.create_foreign_key(
        'kpi_indicators_owner_id_fkey',
        'kpi_indicators',
        'users',
        ['owner_id'],
        ['id'],
        ondelete='SET NULL'
    )

    op.create_foreign_key(
        'kpi_indicators_project_id_fkey',
        'kpi_indicators',
        'projects',
        ['project_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Create indexes for new columns
    op.create_index('ix_kpi_indicators_owner_id', 'kpi_indicators', ['owner_id'])
    op.create_index('ix_kpi_indicators_project_id', 'kpi_indicators', ['project_id'])
    op.create_index('ix_kpi_indicators_status', 'kpi_indicators', ['status'])
    op.create_index('ix_kpi_indicators_period', 'kpi_indicators', ['period'])

    # ============================================================================
    # Step 3: Create kpi_measurements table
    # ============================================================================
    op.create_table(
        'kpi_measurements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('indicator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('measured_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source', sa.String(100), nullable=True, server_default='manual'),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['indicator_id'], ['kpi_indicators.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for kpi_measurements
    op.create_index('ix_kpi_measurements_indicator_id', 'kpi_measurements', ['indicator_id'])
    op.create_index('ix_kpi_measurement_ts', 'kpi_measurements', ['indicator_id', sa.text('measured_at DESC')], postgresql_using='btree')

    # ============================================================================
    # Step 4: Create metric_bindings table
    # ============================================================================
    op.create_table(
        'metric_bindings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kpi_indicator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('okr_kr_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('weight', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('auto_update', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['kpi_indicator_id'], ['kpi_indicators.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['okr_kr_id'], ['key_results.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            '(task_id IS NOT NULL)::int + (project_id IS NOT NULL)::int + (okr_kr_id IS NOT NULL)::int = 1',
            name='metric_binding_one_entity_check'
        )
    )

    # Create indexes for metric_bindings
    op.create_index('ix_metric_bindings_kpi_indicator_id', 'metric_bindings', ['kpi_indicator_id'])
    op.create_index('ix_metric_bindings_task_id', 'metric_bindings', ['task_id'])
    op.create_index('ix_metric_bindings_project_id', 'metric_bindings', ['project_id'])
    op.create_index('ix_metric_bindings_okr_kr_id', 'metric_bindings', ['okr_kr_id'])
    op.create_index('ix_metric_binding_composite', 'metric_bindings', ['task_id', 'okr_kr_id', 'kpi_indicator_id'])


def downgrade() -> None:
    """
    Rollback KPI system enhancements
    """

    # Drop metric_bindings table
    op.drop_table('metric_bindings')

    # Drop kpi_measurements table
    op.drop_table('kpi_measurements')

    # Remove new columns from kpi_indicators
    op.drop_constraint('kpi_indicators_project_id_fkey', 'kpi_indicators', type_='foreignkey')
    op.drop_constraint('kpi_indicators_owner_id_fkey', 'kpi_indicators', type_='foreignkey')

    op.drop_index('ix_kpi_indicators_period', 'kpi_indicators')
    op.drop_index('ix_kpi_indicators_status', 'kpi_indicators')
    op.drop_index('ix_kpi_indicators_project_id', 'kpi_indicators')
    op.drop_index('ix_kpi_indicators_owner_id', 'kpi_indicators')

    op.drop_column('kpi_indicators', 'metadata')
    op.drop_column('kpi_indicators', 'next_review_date')
    op.drop_column('kpi_indicators', 'last_measured_at')
    op.drop_column('kpi_indicators', 'project_id')
    op.drop_column('kpi_indicators', 'owner_id')
    op.drop_column('kpi_indicators', 'status')
    op.drop_column('kpi_indicators', 'aggregation')
    op.drop_column('kpi_indicators', 'period')
    op.drop_column('kpi_indicators', 'kpi_type')
    op.drop_column('kpi_indicators', 'formula_metadata')
    op.drop_column('kpi_indicators', 'formula')
    op.drop_column('kpi_indicators', 'source_type')
    op.drop_column('kpi_indicators', 'alarm_threshold')
    op.drop_column('kpi_indicators', 'warn_threshold')
    op.drop_column('kpi_indicators', 'baseline_value')

    # Restore description column type
    op.alter_column('kpi_indicators', 'description',
                    existing_type=sa.Text(),
                    type_=sa.String(1024),
                    existing_nullable=True)

    # Restore current_value as NOT NULL
    op.alter_column('kpi_indicators', 'current_value',
                    existing_type=sa.Float(),
                    nullable=False)

    # Rename table back to 'kpis'
    op.drop_constraint('kpi_indicators_org_id_fkey', 'kpi_indicators', type_='foreignkey')
    op.rename_table('kpi_indicators', 'kpis')
    op.execute("ALTER INDEX IF EXISTS kpi_indicators_pkey RENAME TO kpis_pkey")
    op.execute("ALTER INDEX IF EXISTS ix_kpi_indicators_org_id RENAME TO ix_kpis_org_id")

    # Restore original foreign key
    op.create_foreign_key(
        'kpis_org_id_fkey',
        'kpis',
        'organizations',
        ['org_id'],
        ['id'],
        ondelete='CASCADE'
    )
