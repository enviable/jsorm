import { pluralize, underscore } from 'inflected'

import { 
  applyModelConfig,
  isModelInstance,
  JSORMBase, 
  ModelConfiguration, 
  ModelConfigurationOptions, 
} from './model'

import { 
  Attribute, 
  AttributeOptions 
} from './attribute'

import {
  AssociationRecord,
  AssociationBase,
  HasMany,
  HasOne,
  BelongsTo,
} from './associations'
import Model from './model-old';

const ModelDecorator = function(config? : ModelConfigurationOptions) {
  return function<M extends typeof JSORMBase>(target: M) : void {
    modelFactory(target, config)
  }
}

function modelFactory<M extends typeof JSORMBase>(ModelClass : typeof JSORMBase, config? : ModelConfigurationOptions) : void {
  ensureModelInheritance(ModelClass)

  if (config) {
    applyModelConfig(ModelClass, config)
  }

  if (!ModelClass.jsonapiType && !ModelClass.isBaseClass) {
    ModelClass.jsonapiType = pluralize(underscore(ModelClass.name))
  }

  ModelClass.registerType()
}

function AttrDecoratorFactory(config? : AttributeOptions) : PropertyDecorator
function AttrDecoratorFactory(target : JSORMBase, propertyKey : string) : void
function AttrDecoratorFactory(configOrTarget? : JSORMBase | AttributeOptions | undefined, propertyKey? : string) : any {
  let attrDefinition = new Attribute({name: propertyKey})

  const attrFunction = function(ModelClass : typeof JSORMBase, propertyKey : string | symbol) : PropertyDescriptor {
    ensureModelInheritance(ModelClass)
    // ensureClonedAttrList(ModelClass)

    ModelClass.attributeList[propertyKey] = attrDefinition

    return attrDefinition.descriptor()
  }

  if (isModelInstance(configOrTarget) ) {
    // For type checking. Can't have a model AND no property key
    if (!propertyKey) {
      throw new Error('This should not be possible')
    }
    let target : JSORMBase = configOrTarget

    return attrFunction(<any>target.constructor, propertyKey)
  } else {
    if (configOrTarget) {
      attrDefinition = new Attribute(Object.assign({name: propertyKey}, configOrTarget))
    }

    return function(target : JSORMBase, propertyKey : string | symbol) {
      return attrFunction(<any>target.constructor, propertyKey)
    }
  }
}

function ensureModelInheritance(ModelClass : typeof JSORMBase) {
  if (ModelClass.currentClass !== ModelClass) {
    ModelClass.currentClass.inherited(ModelClass)
  }
}

// function ensureClonedAttrList(ModelClass : typeof JSORMBase) {
//   ensureModelInheritance(ModelClass)
//   if (ModelClass.attributeList === ModelClass.parentClass.attributeList) {
//     ModelClass.attributeList = Object.assign({}, ModelClass.parentClass.attributeList)
//   }
// }

/* 
 * Yup that's a super-Java-y method name.  Decorators in 
 * ES7/TS are either of the form:
 * 
 * @decorator foo : string
 * or 
 * @decorator(options) foo : string
 * 
 * The first is a function that directly decorates the 
 * property, while this second is a factory function
 * that returns a decorator function.
 * 
 * This method builds the factory function for each of our
 * association types
 * 
 */ 
function AssociationDecoratorFactoryBuilder<T extends JSORMBase>(AttrType: typeof AssociationBase) {
  return function(optsOrType: AssociationRecord<T> | string) {
    function extend(ModelClass : typeof JSORMBase) : typeof JSORMBase {
      ensureModelInheritance(ModelClass)

      return ModelClass
    }

    let opts : AssociationRecord<T>

    if(typeof optsOrType === 'string') {
      // lookup type
    } else {
      opts = optsOrType
    }

    return function(target: JSORMBase, propertyKey : string | symbol) {
      let attrDefinition = new AttrType(opts)
    
      extend(<any>target.constructor).attributeList[propertyKey] = attrDefinition

      attrDefinition.descriptor()
    }
  }
}

const HasManyDecoratorFactory = AssociationDecoratorFactoryBuilder(HasMany)
const HasOneDecoratorFactory = AssociationDecoratorFactoryBuilder(HasOne)
const BelongsToDecoratorFactory = AssociationDecoratorFactoryBuilder(BelongsTo)

export { 
  ModelDecorator as Model, 
  AttrDecoratorFactory as Attr,
  HasManyDecoratorFactory as HasMany,
  HasOneDecoratorFactory as HasOne,
  BelongsToDecoratorFactory as BelongsTo,
}
