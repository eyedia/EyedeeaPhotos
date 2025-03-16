import {
  get_source_summary as meta_get_source_summary
} from "../../meta/meta_system.js";
import config_log from "../../config_log.js";

const logger = config_log.logger;

export const get_source_summary = async (req, res) => {
  try {
    meta_get_source_summary((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(rows);
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};

