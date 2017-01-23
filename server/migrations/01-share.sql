ALTER TABLE share DROP PRIMARY KEY;
ALTER TABLE share ADD id INT PRIMARY KEY AUTO_INCREMENT;


CREATE TABLE `share_1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hammerId` int(11) DEFAULT NULL,
  `nailId` int(11) DEFAULT NULL,
  `hammerAuthorId` int(11) DEFAULT NULL,
  `nailAuthorId` int(11) DEFAULT NULL,
  `sharedCount` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `lastShared` datetime DEFAULT NULL,
  `img` varchar(512) NOT NULL,
  `data` text,
  PRIMARY KEY (`id`),
  KEY `user_nails_shares` (`nailAuthorId`,`nailId`),
  KEY `user_hammers_shares` (`hammerAuthorId`,`hammerId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8;

INSERT INTO share_1 (id, hammerId, nailId, hammerAuthorId, nailAuthorId,created,img,sharedCount, lastShared, data)
SELECT hammerId, hammerId, nailId, hammerAuthorId, nailAuthorId,created,img,sharedCount, lastShared, data FROM share;

RENAME TABLE share TO old_share,
	share_1 TO share;

