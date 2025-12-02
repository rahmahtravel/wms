### Tugas Anda :

1. Pelajari code app saya secara menyeluruh
2. Pastikan seluruh fitur fitur nya dapat berfungsi dengan baik dan pastikan tidak ada error
3. Nah saya ingin merubah suatu struktur table 'stock_movements'  :
1	id Primary	int			No	None		AUTO_INCREMENT	Change Change	Drop Drop	
	2	id_barang Index	int			No	None			Change Change	Drop Drop	
	3	warehouse_id Index	int			No	None			Change Change	Drop Drop	
	4	rack_id Index	int			Yes	NULL			Change Change	Drop Drop	
	5	bin_id Index	int			Yes	NULL			Change Change	Drop Drop	
	6	unit_id Index	int			Yes	NULL			Change Change	Drop Drop	
	7	branch_id Index	int			Yes	NULL			Change Change	Drop Drop	
	8	movement_type	enum('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'OPNAM...	utf8mb4_general_ci		No	None			Change Change	Drop Drop	
	9	reference_type	enum('INCOMING', 'OUTGOING', 'TRANSFER', 'ADJUSTME...	utf8mb4_general_ci		No	None			Change Change	Drop Drop	
	10	reference_id	int			Yes	NULL			Change Change	Drop Drop	
	11	quantity_before	int			Yes	0			Change Change	Drop Drop	
	12	quantity_change	int			No	None			Change Change	Drop Drop	
	13	quantity_after	int			Yes	0			Change Change	Drop Drop	
	14	movement_date Index	timestamp			Yes	CURRENT_TIMESTAMP		DEFAULT_GENERATED	Change Change	Drop Drop	
	15	notes	text	utf8mb4_general_ci		Yes	NULL			Change Change	Drop Drop	
	16	user_id	int			Yes	NULL			Change Change	Drop Drop	
	17	created_at	timestamp			Yes	CURRENT_TIMESTAMP		DEFAULT_GENERATED	Change Change	Drop Drop	
	18	created_by Index	int			Yes	NULL			Change Change	Drop Drop	
	19	updated_by Index	int			Yes	NULL			Change Change	Drop Drop	
	20	deleted_at	timestamp			Yes	NULL			Change Change	Drop Drop	
	21	deleted_by Index	int			Yes	NULL			Change Change	Drop Drop	

nah saya ingin field 'warehouse_id', 'rack_id', dan 'bin_id' itu di hapus saja, nah lalu untuk table 'purchasing_barang' :
1	id_barang Primary	int			No	None		AUTO_INCREMENT	Change Change	Drop Drop	
	2	category_id Index	int			Yes	NULL			Change Change	Drop Drop	
	3	id_jenis_barang Index	int			Yes	NULL			Change Change	Drop Drop	
	4	kode_barang Index	varchar(20)	utf8mb4_general_ci		No	None			Change Change	Drop Drop	
	5	nama_barang	varchar(255)	utf8mb4_general_ci		No	None			Change Change	Drop Drop	
	6	satuan	enum('pcs', 'set', 'pack')	utf8mb4_general_ci		No	None			Change Change	Drop Drop	
	7	stock_minimal	int			No	10			Change Change	Drop Drop	
	8	stock_akhir	int			No	0			Change Change	Drop Drop	
	9	created_at	timestamp			Yes	CURRENT_TIMESTAMP		DEFAULT_GENERATED	Change Change	Drop Drop	
	10	updated_at	timestamp		on update CURRENT_TIMESTAMP	Yes	CURRENT_TIMESTAMP		DEFAULT_GENERATED ON UPDATE CURRENT_TIMESTAMP	Change Change	Drop Drop	
	11	is_required	tinyint(1)			Yes	0			Change Change	Drop Drop	
	12	is_dynamic	tinyint(1)			Yes	0			Change Change	Drop Drop	
	13	size_type	enum('none', 'clothing', 'age_group')	utf8mb4_general_ci		Yes	none			Change Change	Drop Drop	
setalah field 'stock_akhir', saya ingin menambahkan field 'warehouse_id', 'rack_id', dan 'bin_id'. Yang relasi nya ke dalam table 'warehouse_locations', 'warehouse_racks', dan 'warehouse_bins'. nah lalu buatkan file migrations nya.

### Pada halaman @views\barang\index.ejs pada table nya serelah column Satuan, maka buatkan dan tampilkan column untuk 'warehouse_id', 'rack_id', dan 'bin_id' yang dimana sekaligus dapat UPDATE dan EDIT langsung dari table tersebut untuk memilih nya. Nah lalu pastikan buat design tampilannya yang menarik, modern, elegan, asik, user friendly, dan pastikan responsive di seluruh ukuran lebar layar, terutama lebar layar mobile, pastikan untuk penempatan layout dan tata letak nya dibuat bagus dan serapih dan semenarik mungkin, pastikan buat tampilannya sederhana tetapi sangat memiliki nilai estetika dan pastikan clean.

# Coba tolong pastikan perbaiki serta sesuaikan seluruh fungsi fungsi sistem yang terkait.

#### COba tolong di analisi lagi, cari tahu lagi, pelajari lagi, perbaiki serta sesuaikan, pastikan sampai benar benar dapat berfungsi dengan baik seluruhnya dan pastikan outputnya benar benar bisa sesuai request

### NOTED :
Jangan sampai menghilangkan, menghapus, dan merusak fungsi fungsi code sebelumnya atau fungsi logic code yang sudah ada, cukup focus untuk memperbaiki dan menyesuaikan hal tersebut saja sampai benar benar bisa berfungsi dengan baik.
