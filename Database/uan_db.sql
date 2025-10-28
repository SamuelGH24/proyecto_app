CREATE DATABASE uan_db;
USE uan_db;
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE peliculas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  anio INT,
  director VARCHAR(100),
  elenco TEXT,
  genero VARCHAR(100),
  descripcion TEXT,
  poster VARCHAR(255),
  codigo_hash VARCHAR(64) UNIQUE
);
CREATE TABLE resenas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  pelicula_id INT NOT NULL,
  texto TEXT NOT NULL,
  calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (pelicula_id) REFERENCES peliculas(id)
);
INSERT INTO peliculas (titulo, anio, director, genero, descripcion, poster, codigo_hash)
VALUES
('Inception', 2010, 'Christopher Nolan', 'Acción, Ciencia ficción', 'Un ladrón roba secretos del subconsciente durante los sueños.', 'https://via.placeholder.com/96x144?text=Inception', 'hash_inception2010'),
('Spirited Away', 2001, 'Hayao Miyazaki', 'Animación, Fantasía', 'Una niña queda atrapada en un mundo mágico y debe volver a casa.', 'https://via.placeholder.com/96x144?text=Spirited+Away', 'hash_spiritedaway2001');

use uan_db;
DELETE FROM peliculas;
SELECT * FROM peliculas;
UPDATE peliculas
SET poster = NULL;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM peliculas;
INSERT INTO peliculas (id, titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash)
VALUES
(1, 'Inception', '2010', 'Christopher Nolan', 'Leonardo DiCaprio, Joseph Gordon-Levitt', 'Acción, Ciencia ficción', 'Un ladrón roba secretos del subconsciente durante los sueños.', NULL, 'hash_inception2010'),
(2, 'Spirited Away', '2001', 'Hayao Miyazaki', 'Rumi Hiiragi, Miyu Irino', 'Animación, Fantasía', 'Chihiro queda atrapada en un mundo mágico y debe salvar a sus padres.', NULL, 'hash_spiritedaway2001'),
(3, 'The Legend of Zelda', '2025', 'A. Example', 'Actor 1, Actor 2', 'Aventura, Fantasía', 'Un joven héroe debe explorar reinos y enfrentarse a fuerzas oscuras para salvar a la princesa.', NULL, 'ZELDA123'),
(4, 'Parasite', '2019', 'Bong Joon-ho', 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong', 'Drama, Thriller', 'Una familia pobre se infiltra en una familia rica con consecuencias inesperadas.', NULL, 'PARA2019'),
(5, 'Interstellar', '2014', 'Christopher Nolan', 'Matthew McConaughey, Anne Hathaway', 'Ciencia ficción, Aventura', 'Un grupo de astronautas viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.', NULL, 'INTER2014'),
(6, 'Your Name', '2016', 'Makoto Shinkai', 'Ryunosuke Kamiki, Mone Kamishiraishi', 'Animación, Romance', 'Dos adolescentes intercambian cuerpos misteriosamente y deben encontrarse antes de que sea demasiado tarde.', NULL, 'YOUR2016'),
(7, 'The Matrix', '1999', 'Lana Wachowski, Lilly Wachowski', 'Keanu Reeves, Laurence Fishburne', 'Acción, Ciencia ficción', 'Un hacker descubre que la realidad es una simulación controlada por máquinas.', NULL, 'MATRIX1999');

DELETE FROM resenas;



DELETE FROM resenas;
DELETE FROM peliculas;

DELETE FROM resenas;
DELETE FROM peliculas;

INSERT INTO peliculas (id, titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash)
VALUES
(1, 'Inception', '2010', 'Christopher Nolan', 'Leonardo DiCaprio, Joseph Gordon-Levitt', 'Acción, Ciencia ficción', 'Un ladrón roba secretos del subconsciente durante los sueños.', 'https://pics.filmaffinity.com/inception_the_cobol_job-606496025-mmed.jpg', 'hash_inception2010'),
(2, 'Spirited Away', '2001', 'Hayao Miyazaki', 'Rumi Hiiragi, Miyu Irino', 'Animación, Fantasía', 'Chihiro queda atrapada en un mundo mágico y debe salvar a sus padres.', 'https://pics.filmaffinity.com/koe_no_katachi_a_silent_voice-681738753-mmed.jpg', 'hash_spiritedaway2001'),
(3, 'The Legend of Zelda', '2025', 'A. Example', 'Actor 1, Actor 2', 'Aventura, Fantasía', 'Un joven héroe debe explorar reinos y enfrentarse a fuerzas oscuras para salvar a la princesa.', 'https://pics.filmaffinity.com/yasha_legends_of_the_demon_blade-463380855-mmed.jpg', 'ZELDA123'),
(4, 'Parasite', '2019', 'Bong Joon-ho', 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong', 'Drama, Thriller', 'Una familia pobre se infiltra en una familia rica con consecuencias inesperadas.', 'https://pics.filmaffinity.com/gisaengchung-432616131-mmed.jpg', 'PARA2019'),
(5, 'Interstellar', '2014', 'Christopher Nolan', 'Matthew McConaughey, Anne Hathaway', 'Ciencia ficción, Aventura', 'Un grupo de astronautas viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.', 'https://pics.filmaffinity.com/the_exterminator-135496060-mmed.jpg', 'INTER2014'),
(6, 'Your Name', '2016', 'Makoto Shinkai', 'Ryunosuke Kamiki, Mone Kamishiraishi', 'Animación, Romance', 'Dos adolescentes intercambian cuerpos misteriosamente y deben encontrarse antes de que sea demasiado tarde.', 'https://pics.filmaffinity.com/kimi_no_na_wa_your_name-612760352-mmed.jpg', 'YOUR2016'),
(7, 'The Matrix', '1999', 'Lana Wachowski, Lilly Wachowski', 'Keanu Reeves, Laurence Fishburne', 'Acción, Ciencia ficción', 'Un hacker descubre que la realidad es una simulación controlada por máquinas.', 'https://pics.filmaffinity.com/the_matrix-155050517-mmed.jpg', 'MATRIX1999');