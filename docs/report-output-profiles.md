# Report Output Profiles

The supplied report examples show that TIC report generation must be selected by commodity and inspection classification, not by one generic inspection report template.

## Inspection Classifications

- `ORIGIN` - inspection at origin or primary loading/inspection point.
- `DESTINATION` - inspection at destination or receiving point.
- `DAMAGE` - damage-focused inspection, usually with claim/condition evidence.

## Commodity-Specific Template Selection

Report generation should resolve the PDF/report profile by:

1. Tenant
2. Organization, when an organization override exists
3. Commodity
4. Inspection classification
5. Standard/form template

The database migration `V3__commodity_inspection_report_profiles.sql` adds:

- `commodities`
- `report_profiles`
- `commodity_id` and `inspection_classification` on standards, form templates, inspection requests, inspections, and reports
- `report_profile_key` on inspections and reports

## Fresh Fruit / Avocado Profile

Sample profile key:

```text
fresh-fruit-analysis-on-spot
```

Observed sections:

- Header: customer, shipper, warehouse, container number, boxes, inspector, carrier, inspection date
- Commodity details: commodity, fruit type, label, atmosphere type, country origin, reinspection flag
- Final score: Excellent, Good, Fair, Poor, Bad percentages
- Notes: quality, condition, temperature notes, temperature recorder notes, more info
- Pictures: photo appendix with captions

These sections map cleanly into the existing configurable `report_templates` hierarchy and the new `report_profiles.sections` JSONB selector.
