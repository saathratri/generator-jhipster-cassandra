import _ from 'lodash';

export const springDataCassandraSaathratriUtils = {
    
    /****************************************************
     * cassandra-spring-data-cassandra Helper Functions
     ****************************************************/

    generatePrimaryKeyMethods(entityClass, entityInstance, entityInstanceSnakeCase, primaryKey, fileType) {
        if (!primaryKey || !Array.isArray(primaryKey.ids)) {
            console.error('Invalid primary key details provided');
            return [];
        }
        
        const methodsCode = [];
        let methodComponents = {
            name: "",
            paramsDecl: "",
            paramsInst: "",
            javaDocParams: "",
            urlSubst: "",
            logSubst: "",
            resourceParamsDecl: "",
            repoQueryStr: ""
        };
        
        let findLastComponents = { ...methodComponents };
        const totalIds = primaryKey.ids.length;
        
        primaryKey.ids.forEach((id, index) => {
            const { fieldName, fieldType, fieldNameHumanized, fieldNameUnderscored, isClusteredKeySaathratri, fieldTypeTimeUuidSaathratri } = id;
            
            this.appendMethodComponents(methodComponents, primaryKey.nameCapitalized, fieldName, fieldType, fieldNameHumanized);
            if (index < totalIds - 1) {
                this.appendMethodComponents(findLastComponents, primaryKey.nameCapitalized, fieldName, fieldType, fieldNameHumanized);
                if (primaryKey.hasTimeUUID) {
                    methodComponents.repoQueryStr += `${fieldNameUnderscored} = ?${index}`;
                }
            }
            
            if (index < totalIds) {
                if(index === totalIds - 1) {
                    this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findBy', methodComponents, fileType);
                } else {
                    this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findAllBy', methodComponents, fileType);
                }
            }

            if (isClusteredKeySaathratri && (fieldType === 'Long' || fieldTypeTimeUuidSaathratri)) {
                this.addComparisonMethods(methodsCode, entityClass, entityInstanceSnakeCase, methodComponents, fileType);
            }
        });
        
        if (primaryKey.hasTimeUUID) {
            this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findLatestBy', findLastComponents, fileType);
        }
        
        return methodsCode;
    },
    
    appendMethodComponents(components, keyName, fieldName, fieldType, fieldNameHumanized) {
        const prefix = components.name ? "And" : "";
        components.name += `${prefix}${keyName}${_.upperFirst(fieldName)}`;
        components.paramsDecl += components.paramsDecl ? ", " : "";
        components.paramsDecl += `final ${fieldType} ${fieldName}`;
        components.paramsInst += components.paramsInst ? ", " : "";
        components.paramsInst += fieldName;
        components.javaDocParams += ` * @param ${fieldName} the ${fieldNameHumanized} of the entity to retrieve.\n`;
        components.urlSubst += `/:${fieldName}`;
        components.logSubst += components.logSubst ? ", " : "";
        components.logSubst += `${fieldName}: {}`;
        components.resourceParamsDecl += components.resourceParamsDecl ? ", " : "";
        components.resourceParamsDecl += `@RequestParam(name = "${fieldName}", required = true) final ${fieldType} ${fieldName}`;
    },
    
    addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, methodType, components, fileType) {
        // EXISTING: Generate non-paginated methods
        if (fileType === 'Service') {
            methodsCode.push(this.getPrimaryKeyMethodSignature(entityClass, methodType, components.name, '', components.paramsDecl) + ';');
        } else if (fileType === 'Repository') {
            methodsCode.push(this.getPrimaryKeyRepositoryMethodSignature(entityClass, entityInstanceSnakeCase, methodType, components.name, '', components.paramsDecl, '') + ';');
        } else if (fileType === 'ServiceImpl') {
            methodsCode.push(this.generatePrimaryKeyServiceMethodImplementation(entityClass, methodType, components.name, '', components.paramsDecl, components.paramsInst));
        } else if (fileType === 'Resource') {
            methodsCode.push(this.generatePrimaryKeyResourceMethodImplementation(
                entityClass, methodType, components.name, '', components.paramsInst, components.urlSubst,
                components.resourceParamsDecl, components.logSubst, components.javaDocParams, entityClass));
        }

        // NEW: Generate paginated methods for findAllBy
        if (methodType === 'findAllBy') {
            if (fileType === 'Repository') {
                methodsCode.push(this.getPaginatedRepositoryMethodSignature(entityClass, methodType, components.name, components.paramsDecl) + ';');
            } else if (fileType === 'Service') {
                methodsCode.push(this.getPaginatedServiceMethodSignature(entityClass, methodType, components.name, components.paramsDecl) + ';');
            } else if (fileType === 'ServiceImpl') {
                methodsCode.push(this.generatePaginatedServiceMethodImplementation(entityClass, methodType, components.name, components.paramsDecl, components.paramsInst));
            } else if (fileType === 'Resource') {
                methodsCode.push(this.generatePaginatedResourceMethodImplementation(
                    entityClass, methodType, components.name, components.paramsInst, components.urlSubst,
                    components.resourceParamsDecl, components.logSubst, components.javaDocParams));
            }
        }
    },
    
    addComparisonMethods(methodsCode, entityClass, entityInstanceSnakeCase, components, fileType) {
        ['LessThan', 'GreaterThan'].forEach(op => {
            this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findAllBy', { ...components, name: components.name + op }, fileType);
        });
    },    

    generatePrimaryKeyServiceMethodImplementation(entityClass, methodNamePrefix, methodNameString, operatorString, methodParametersDeclarationsString, methodParametersInstancesString) {
        let methodImplementationString = "@Override \npublic " + this.getPrimaryKeyMethodSignature(entityClass, methodNamePrefix, methodNameString, operatorString, methodParametersDeclarationsString) + `{\n`;
        methodImplementationString += `LOG.debug("Request to ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString}) service in ${entityClass}ServiceImpl.");\n`;
        methodImplementationString += `return ${_.lowerFirst(entityClass)}Repository.${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersInstancesString})\n`;
       
        if(methodNamePrefix === 'findAllBy') {
            methodImplementationString += `.stream()\n`;
        }

        methodImplementationString += `.map(${_.lowerFirst(entityClass)}Mapper::toDto)\n`;
        
        if(methodNamePrefix === 'findLatestBy') {
            methodImplementationString += '.orElse(null); // Return null if no record found\n';
        } else if(methodNamePrefix === 'findBy') {
            methodImplementationString += ';\n';
        } else {
            methodImplementationString += '.collect(Collectors.toCollection(LinkedList::new));\n';
        }

        methodImplementationString += '}\n';

        return methodImplementationString;
    },

    generatePrimaryKeyResourceMethodImplementation(
        entityClass,
        methodNamePrefix,
        methodNameString, 
        operatorString,  
        methodParametersInstancesString, 
        methodUrlSubstitutionParameters, 
        methodResourceParametersDeclarationsString,
        methodLogSubstitutionParameters, 
        methodJavaDocParametersString,   
        entityInstance) {

        let methodImplementationString = "/** \n";
        methodImplementationString += ` * // Composite Primary Key Code \n`; 
        methodImplementationString += ` * {@code GET /${this.getCompositePrimaryKeyGetMappingUrl(methodNamePrefix + methodNameString + operatorString)}${methodUrlSubstitutionParameters}}\n`;
        methodImplementationString += ` * \n`;
        methodImplementationString += ` * \n`;
        methodImplementationString += `${methodJavaDocParametersString}`;
        methodImplementationString += ` * \n`;
        methodImplementationString += ` * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the ${entityInstance}, or with status {@code 404 (Not Found)}. \n`;
        methodImplementationString += ` */ \n`;
        methodImplementationString += `@GetMapping("/${this.getCompositePrimaryKeyGetMappingUrl(methodNamePrefix + methodNameString + operatorString)}")\n`;
        methodImplementationString += "public " + this.getPrimaryKeyMethodSignature(entityClass, methodNamePrefix, methodNameString, operatorString, methodResourceParametersDeclarationsString) + `{ \n`;
        methodImplementationString += "  // Composite Primary Key Code \n";
        methodImplementationString += `  LOG.debug("REST request to ${methodNamePrefix + methodNameString + operatorString} method for ${entityClass}s with parameteres ${methodLogSubstitutionParameters}", ${methodParametersInstancesString}); \n`;
        methodImplementationString += `  return  ${_.lowerFirst(entityInstance)}Service.${methodNamePrefix + methodNameString + operatorString}(${methodParametersInstancesString}); \n`;
        methodImplementationString += '}\n';

        return methodImplementationString;
    },

    getPrimaryKeyMethodSignature(entityClass, methodNamePrefix, methodNameString, operatorString, methodParametersDeclarationsString) {
        if(methodNamePrefix === 'findBy') {
            return `Optional<${entityClass}DTO> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
        } else if(methodNamePrefix === 'findLatestBy') {
            return `${entityClass}DTO ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
        } else {
            return `List<${entityClass}DTO> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
        }
    },

    getPrimaryKeyRepositoryMethodSignature(entityClass, entityInstanceSnakeCase, methodNamePrefix, methodNameString, operatorString, methodParametersDeclarationsString, methodRepositoryParametersQueryString) {
        if(methodNamePrefix === 'findBy') {
            return `Optional<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
        } else if(methodNamePrefix === 'findAllBy') {
            return `List<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
        } else if(methodNamePrefix === 'findLatestBy') {
            let methodImplementationString = `@Query("SELECT * FROM ${entityInstanceSnakeCase} WHERE ${methodRepositoryParametersQueryString} LIMIT 1")\n`;
            methodImplementationString += `Optional<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString});\n`;

            return methodImplementationString;
        }
    },

    getCompositePrimaryKeyGetMappingUrl(methodName) {
        methodName = methodName.charAt(0).toLowerCase() + methodName.slice(1);
        
        return methodName.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
    },

    getCompositePrimaryKeyLogStatement(primaryKey) {
        return primaryKey.ids.map(pk => `${pk.fieldName}: {}`).join(', ');
    },

    getCompositePrimaryKeyResourceClassMethodQueryParameters(primaryKey) {
        return primaryKey.ids.map(pk => `@RequestParam(name = "${pk.fieldName}", required = true) final ${pk.fieldType} ${pk.fieldName}`).join(', \n');
    },

    /****************************************************
     * Pagination Helper Functions (New - for Cassandra Slice-based pagination)
     ****************************************************/

    /**
     * Generate paginated repository method signature (Slice-based for Cassandra)
     * @param {string} entityClass - Entity class name
     * @param {string} methodType - Method type (e.g., 'findAllBy')
     * @param {string} methodName - Method name suffix
     * @param {string} params - Method parameters
     * @returns {string} Repository method signature
     */
    getPaginatedRepositoryMethodSignature(entityClass, methodType, methodName, params) {
        const paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
        return `Slice<${entityClass}> ${methodType}${methodName}(${paginatedParams})`;
    },

    /**
     * Generate paginated service method signature
     * @param {string} entityClass - Entity class name
     * @param {string} methodType - Method type (e.g., 'findAllBy')
     * @param {string} methodName - Method name suffix
     * @param {string} params - Method parameters
     * @returns {string} Service method signature
     */
    getPaginatedServiceMethodSignature(entityClass, methodType, methodName, params) {
        const paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
        return `Slice<${entityClass}DTO> ${methodType}${methodName}Pageable(${paginatedParams})`;
    },

    /**
     * Generate paginated service implementation
     * @param {string} entityClass - Entity class name
     * @param {string} methodType - Method type (e.g., 'findAllBy')
     * @param {string} methodName - Method name suffix
     * @param {string} params - Method parameter declarations
     * @param {string} paramsInst - Method parameter instances
     * @returns {string} Service method implementation
     */
    generatePaginatedServiceMethodImplementation(entityClass, methodType, methodName, params, paramsInst) {
        const paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
        const paginatedParamsInst = paramsInst ? `${paramsInst}, pageable` : 'pageable';

        let impl = `@Override\n`;
        impl += `public ${this.getPaginatedServiceMethodSignature(entityClass, methodType, methodName, params)} {\n`;
        impl += `    LOG.debug("Request to ${methodType}${methodName}Pageable service in ${entityClass}ServiceImpl with pagination.");\n`;
        impl += `    return ${_.lowerFirst(entityClass)}Repository.${methodType}${methodName}(${paginatedParamsInst})\n`;
        impl += `        .map(${_.lowerFirst(entityClass)}Mapper::toDto);\n`;
        impl += `}\n`;

        return impl;
    },

    /**
     * Generate paginated resource method implementation
     * @param {string} entityClass - Entity class name
     * @param {string} methodType - Method type
     * @param {string} methodName - Method name suffix
     * @param {string} paramsInst - Parameter instances
     * @param {string} urlSubst - URL substitution parameters
     * @param {string} resourceParams - Resource parameter declarations
     * @param {string} logSubst - Log substitution parameters
     * @param {string} javaDocParams - JavaDoc parameters
     * @returns {string} Resource method implementation
     */
    generatePaginatedResourceMethodImplementation(
        entityClass,
        methodType,
        methodName,
        paramsInst,
        urlSubst,
        resourceParams,
        logSubst,
        javaDocParams
    ) {
        const methodNameFull = `${methodType}${methodName}Pageable`;
        const urlPath = this.getCompositePrimaryKeyGetMappingUrl(methodNameFull);
        const paginatedResourceParams = resourceParams ?
            `${resourceParams}, @org.springdoc.core.annotations.ParameterObject Pageable pageable` :
            '@org.springdoc.core.annotations.ParameterObject Pageable pageable';
        const paginatedParamsInst = paramsInst ? `${paramsInst}, pageable` : 'pageable';

        let impl = `/**\n`;
        impl += ` * {@code GET /${urlPath}${urlSubst}} : get paginated entities by composite key.\n`;
        impl += ` *\n`;
        impl += `${javaDocParams}`;
        impl += ` * @param pageable the pagination information.\n`;
        impl += ` * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of entities in body.\n`;
        impl += ` */\n`;
        impl += `@GetMapping("/${urlPath}")\n`;
        impl += `public ResponseEntity<List<${entityClass}DTO>> ${methodNameFull}(${paginatedResourceParams}) {\n`;
        impl += `    LOG.debug("REST request to get paginated ${entityClass}s with parameters ${logSubst}", ${paramsInst});\n`;
        impl += `    Slice<${entityClass}DTO> slice = ${_.lowerFirst(entityClass)}Service.${methodNameFull}(${paginatedParamsInst});\n`;
        impl += `    \n`;
        impl += `    // Generate Slice pagination headers (Cassandra cursor-based pagination)\n`;
        impl += `    HttpHeaders headers = new HttpHeaders();\n`;
        impl += `\n`;
        impl += `    boolean hasNext = slice.hasNext();\n`;
        impl += `    headers.add("X-Page-Size", String.valueOf(slice.getSize()));\n`;
        impl += `\n`;
        impl += `    // Extract paging state from current pageable (populated after query execution)\n`;
        impl += `    ByteBuffer nextPagingState = null;\n`;
        impl += `    if (hasNext && slice.getPageable() instanceof CassandraPageRequest) {\n`;
        impl += `        CassandraPageRequest currentCassandraPageRequest = (CassandraPageRequest) slice.getPageable();\n`;
        impl += `        nextPagingState = currentCassandraPageRequest.getPagingState();\n`;
        impl += `    }\n`;
        impl += `    if (hasNext && nextPagingState == null) {\n`;
        impl += `        try {\n`;
        impl += `            Pageable nextPageable = slice.nextPageable();\n`;
        impl += `            if (nextPageable instanceof CassandraPageRequest) {\n`;
        impl += `                nextPagingState = ((CassandraPageRequest) nextPageable).getPagingState();\n`;
        impl += `            }\n`;
        impl += `        } catch (IllegalStateException e) {\n`;
        impl += `            LOG.warn("Unable to resolve next paging state for ${entityClass}s", e);\n`;
        impl += `        }\n`;
        impl += `    }\n`;
        impl += `    hasNext = hasNext && nextPagingState != null;\n`;
        impl += `    if (nextPagingState != null) {\n`;
        impl += `        byte[] pagingStateBytes = new byte[nextPagingState.remaining()];\n`;
        impl += `        nextPagingState.duplicate().get(pagingStateBytes);\n`;
        impl += `        headers.add("X-Paging-State", Base64.getUrlEncoder().encodeToString(pagingStateBytes));\n`;
        impl += `    }\n`;
        impl += `    headers.add("X-Has-Next-Page", String.valueOf(hasNext));\n`;
        impl += `\n`;
        impl += `    return ResponseEntity.ok().headers(headers).body(slice.getContent());\n`;
        impl += `}\n`;

        return impl;
    },
}
