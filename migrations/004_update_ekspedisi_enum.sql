-- Update ekspedisi ENUM to include more courier options
ALTER TABLE jamaah_kelengkapan 
MODIFY COLUMN ekspedisi ENUM(
  'JNE',
  'JNT', 
  'TIKI',
  'POS Indonesia',
  'SiCepat',
  'AnterAja',
  'Ninja Xpress',
  'ID Express',
  'Lion Parcel',
  'SAP Express',
  'Wahana',
  'RPX',
  'First Logistics',
  'Pandu Logistics',
  'KGXpress',
  'Lainnya'
) DEFAULT NULL;