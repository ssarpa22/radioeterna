-- Radio Eterna · 0003 · Production-safe reference data (no stations, no demo rows)
insert into categories (name, slug, display_order) values
 ('Música cristiana','musica-cristiana',1),('Alabanza y adoración','alabanza-y-adoracion',2),
 ('Gospel','gospel',3),('Música cristiana contemporánea','musica-cristiana-contemporanea',4),
 ('Música evangélica','musica-evangelica',5),('Enseñanza bíblica','ensenanza-biblica',6),
 ('Predicación cristiana','predicacion-cristiana',7),('Programación cristiana','programacion-cristiana',8),
 ('Radiodifusión cristiana general','radiodifusion-cristiana-general',9) on conflict (slug) do nothing;

insert into countries (code, name, slug, display_order) values
 ('AR','Argentina','argentina',1),('BO','Bolivia','bolivia',2),('CL','Chile','chile',3),('CO','Colombia','colombia',4),
 ('CR','Costa Rica','costa-rica',5),('CU','Cuba','cuba',6),('EC','Ecuador','ecuador',7),('SV','El Salvador','el-salvador',8),
 ('ES','España','espana',9),('US','Estados Unidos','estados-unidos',10),('GT','Guatemala','guatemala',11),
 ('HN','Honduras','honduras',12),('MX','México','mexico',13),('NI','Nicaragua','nicaragua',14),('PA','Panamá','panama',15),
 ('PY','Paraguay','paraguay',16),('PE','Perú','peru',17),('PR','Puerto Rico','puerto-rico',18),
 ('DO','República Dominicana','republica-dominicana',19),('UY','Uruguay','uruguay',20),('VE','Venezuela','venezuela',21)
 on conflict (code) do nothing;

insert into site_settings (key, value, is_public) values
 ('allow_demo_data','false',false),
 ('platform_name','"Radio Eterna"',true),
 ('platform_description','"Radios cristianas y evangélicas de todo el mundo, en un solo lugar."',true),
 ('contact_email','null',true),
 ('social_links','{}',true) on conflict (key) do nothing;
