/**
 * Settings Components - Reusable UI components for settings
 * Each component type renders a specific setting control
 */

/**
 * Base Setting Component
 */
export class BaseSettingComponent {
  constructor(definition, registry) {
    this.definition = definition;
    this.registry = registry;
    this.element = null;
    this.changeCallbacks = [];
  }

  /**
   * Render the component
   * @returns {HTMLElement} Rendered element
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Get current value
   * @returns {*} Current value
   */
  getValue() {
    return this.registry.getValue(this.definition.id);
  }

  /**
   * Set value
   * @param {*} value - New value
   */
  setValue(value) {
    this.registry.setValue(this.definition.id, value);
    this.notifyChange(value);
  }

  /**
   * Add change listener
   * @param {Function} callback - Change callback
   */
  onChange(callback) {
    this.changeCallbacks.push(callback);
  }

  /**
   * Notify change listeners
   * @param {*} value - New value
   */
  notifyChange(value) {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error('Change callback error:', error);
      }
    });
  }

  /**
   * Create wrapper element
   * @returns {HTMLElement} Wrapper element
   */
  createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';
    wrapper.dataset.settingId = this.definition.id;
    return wrapper;
  }

  /**
   * Create label element
   * @returns {HTMLElement} Label element
   */
  createLabel() {
    const labelContainer = document.createElement('div');
    labelContainer.className = 'setting-label-container';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.textContent = this.definition.label;

    const description = document.createElement('div');
    description.className = 'setting-description';
    description.textContent = this.definition.description;

    labelContainer.appendChild(label);
    labelContainer.appendChild(description);

    return labelContainer;
  }
}

/**
 * Toggle Component
 */
export class ToggleComponent extends BaseSettingComponent {
  render() {
    const wrapper = this.createWrapper();
    wrapper.classList.add('setting-toggle');

    const content = document.createElement('div');
    content.className = 'setting-content';

    const labelContainer = this.createLabel();

    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.getValue();
    
    input.addEventListener('change', (e) => {
      this.setValue(e.target.checked);
    });

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    toggleLabel.appendChild(input);
    toggleLabel.appendChild(slider);
    controlContainer.appendChild(toggleLabel);

    content.appendChild(labelContainer);
    content.appendChild(controlContainer);
    wrapper.appendChild(content);

    this.element = wrapper;
    return wrapper;
  }
}

/**
 * Select Component
 */
export class SelectComponent extends BaseSettingComponent {
  render() {
    const wrapper = this.createWrapper();
    wrapper.classList.add('setting-select');

    const content = document.createElement('div');
    content.className = 'setting-content';

    const labelContainer = this.createLabel();

    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';

    const select = document.createElement('select');
    select.className = 'form-control setting-select-input';

    this.definition.options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      select.appendChild(optionEl);
    });

    select.value = this.getValue();

    select.addEventListener('change', (e) => {
      this.setValue(e.target.value);
    });

    controlContainer.appendChild(select);

    content.appendChild(labelContainer);
    content.appendChild(controlContainer);
    wrapper.appendChild(content);

    this.element = wrapper;
    return wrapper;
  }
}

/**
 * Slider Component
 */
export class SliderComponent extends BaseSettingComponent {
  render() {
    const wrapper = this.createWrapper();
    wrapper.classList.add('setting-slider');

    const content = document.createElement('div');
    content.className = 'setting-content';

    const labelRow = document.createElement('div');
    labelRow.className = 'setting-label-row';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.textContent = this.definition.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'setting-value-display';
    valueDisplay.textContent = this.getValue();

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'form-control-range setting-slider-input';
    slider.min = this.definition.min;
    slider.max = this.definition.max;
    slider.step = this.definition.step;
    slider.value = this.getValue();

    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = value;
      this.setValue(value);
    });

    const description = document.createElement('div');
    description.className = 'setting-description';
    description.textContent = this.definition.description;

    content.appendChild(labelRow);
    content.appendChild(slider);
    content.appendChild(description);
    wrapper.appendChild(content);

    this.element = wrapper;
    return wrapper;
  }
}

/**
 * Text Input Component
 */
export class TextInputComponent extends BaseSettingComponent {
  render() {
    const wrapper = this.createWrapper();
    wrapper.classList.add('setting-text');

    const content = document.createElement('div');
    content.className = 'setting-content';

    const labelContainer = this.createLabel();

    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control setting-text-input';
    input.value = this.getValue() || '';
    input.placeholder = this.definition.placeholder || '';

    input.addEventListener('input', (e) => {
      this.setValue(e.target.value);
    });

    controlContainer.appendChild(input);

    content.appendChild(labelContainer);
    content.appendChild(controlContainer);
    wrapper.appendChild(content);

    this.element = wrapper;
    return wrapper;
  }
}

/**
 * TextArea Component
 */
export class TextAreaComponent extends BaseSettingComponent {
  render() {
    const wrapper = this.createWrapper();
    wrapper.classList.add('setting-textarea');

    const content = document.createElement('div');
    content.className = 'setting-content';

    const labelContainer = this.createLabel();

    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';

    const textarea = document.createElement('textarea');
    textarea.className = 'form-control setting-textarea-input';
    textarea.value = this.getValue() || '';
    textarea.placeholder = this.definition.placeholder || '';
    textarea.rows = this.definition.rows || 4;

    textarea.addEventListener('input', (e) => {
      this.setValue(e.target.value);
    });

    controlContainer.appendChild(textarea);

    content.appendChild(labelContainer);
    content.appendChild(controlContainer);
    wrapper.appendChild(content);

    this.element = wrapper;
    return wrapper;
  }
}

/**
 * Component Factory
 */
export class SettingComponentFactory {
  static createComponent(definition, registry) {
    switch (definition.type) {
      case 'toggle':
        return new ToggleComponent(definition, registry);
      case 'select':
        return new SelectComponent(definition, registry);
      case 'slider':
        return new SliderComponent(definition, registry);
      case 'text':
        return new TextInputComponent(definition, registry);
      case 'textarea':
        return new TextAreaComponent(definition, registry);
      default:
        console.error(`Unknown setting type: ${definition.type}`);
        return null;
    }
  }

  static renderSetting(definition, registry) {
    const component = this.createComponent(definition, registry);
    if (!component) return null;
    return component.render();
  }

  static renderCategory(categoryId, registry) {
    const settings = registry.getSettingsForCategory(categoryId);
    const container = document.createElement('div');
    container.className = 'settings-category-content';

    settings.forEach(definition => {
      const element = this.renderSetting(definition, registry);
      if (element) {
        container.appendChild(element);
      }
    });

    return container;
  }
}

export default SettingComponentFactory;
