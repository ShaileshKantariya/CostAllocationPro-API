import express from 'express';
import { configurationController } from '../controllers';
import {
	addConfigurationFieldValidation,
	deleteConfigurationFieldValidation,
	updateConfigurationFieldValidation,
} from '../helpers/validators';
const configuration = express.Router();

// For get the field by sections
configuration.get('/', configurationController.getFieldsSection);

// For create the field
configuration.post(
	'/',
	addConfigurationFieldValidation,
	configurationController.createField
);

// For update the field
configuration.put(
	'/',
	updateConfigurationFieldValidation,
	configurationController.updateField
);

// For delete the field
configuration.delete(
	'/',
	deleteConfigurationFieldValidation,
	configurationController.deleteField
);

export default configuration;
