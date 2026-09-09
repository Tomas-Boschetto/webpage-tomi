INSERT OR IGNORE INTO recommendations (id, type, title, summary, url, image_url, published, created_at, updated_at)
VALUES
	(
		'seed-movie-1',
		'movie',
		'Aftersun',
		'A quiet, aching portrait of memory and fatherhood — soft light, harder edges underneath.',
		'https://www.imdb.com/title/tt19770238/',
		NULL,
		1,
		datetime('now', '-3 days'),
		datetime('now', '-3 days')
	),
	(
		'seed-book-1',
		'book',
		'The Left Hand of Darkness',
		'Le Guin at her best: politics, loyalty, and belonging on a world of ice.',
		'https://en.wikipedia.org/wiki/The_Left_Hand_of_Darkness',
		NULL,
		1,
		datetime('now', '-2 days'),
		datetime('now', '-2 days')
	),
	(
		'seed-travel-1',
		'travel',
		'Lisbon in late spring',
		'Trams, miradouros at golden hour, and the smell of pastéis after a steep walk.',
		NULL,
		NULL,
		1,
		datetime('now', '-1 days'),
		datetime('now', '-1 days')
	);
