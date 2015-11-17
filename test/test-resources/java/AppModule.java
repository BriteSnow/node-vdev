package com.isonas;

import com.britesnow.snow.util.PackageScanner;
import com.britesnow.snow.web.auth.AuthRequest;
import com.britesnow.snow.web.binding.EntityClasses;
import com.britesnow.snow.web.renderer.JsonRenderer;
import com.google.inject.*;
import com.google.inject.matcher.AbstractMatcher;
import com.google.inject.matcher.Matcher;
import com.google.inject.matcher.Matchers;
import com.googlecode.gentyref.GenericTypeReflector;
import com.isonas.access.DaoAccessInterceptor;
import com.isonas.access.annotation.AssertParamPrivileges;
import com.isonas.access.annotation.AssertReturnPrivileges;
import com.isonas.dao.BaseDao;
import com.isonas.dao.DaoHelper;
import com.isonas.dao.DaoRegistry;
import com.isonas.dao.IDao;
import com.isonas.entity.BaseEntity;
import com.isonas.perf.PerfInterceptor;
import com.isonas.perf.annotation.ToMonitor;
import com.isonas.web.AppAuthService;
import com.isonas.web.AppJsonRenderer;
import org.jomni.JomniMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;

import static java.util.Arrays.asList;

/**
 *	<p>This is the default Guice Module for the application. By best practice, we prefix application config/binding classes with "App",
 *	such as <em>AppConfig</em> or <em>AppAuthService</em> which is bound to the snow <em>AuthService</em> interface.</p>
 *
 */
public class AppConfig extends AbstractModule {
	private static Logger log = LoggerFactory.getLogger(AppConfig.class);
	
	public static final String VERSION = "DROP-Beta1.1-03"; // the version, updated by vdev

	static private final Class<? extends Annotation>[] assertPrivilegeAnnotations = new Class[]{AssertParamPrivileges.class, AssertReturnPrivileges.class};

	// --------- For DaoRegistry --------- //
	static private Matcher entityClassMatcher = Matchers.subclassesOf(BaseEntity.class).and(Matchers.not(matchAbstractClass()));
	static private Class[] entityClasses = new PackageScanner(BaseEntity.class.getPackage().getName())
						.findClasses((c) -> entityClassMatcher.matches(c));
	// --------- /For DaoRegistry --------- //
	
	@Override
	protected void configure() {
		// bind the auth service implementation
		bind(AuthRequest.class).to(AppAuthService.class);

		// bind the jsonRender
		bind(JsonRenderer.class).to(AppJsonRenderer.class);


		// --------- Performance Interceptor --------- //
		// bind the perf interceptor
		PerfInterceptor perfInterceptor = new PerfInterceptor();
		requestInjection(perfInterceptor);
		Matcher perfClassMatcher = Matchers.subclassesOf(BaseDao.class)
				.or(Matchers.annotatedWith(ToMonitor.class)).or(matchAnyOf(DaoHelper.class));
		bindInterceptor(perfClassMatcher, nonSyntheticMethodMatcher() , perfInterceptor);
		// --------- /Performance Interceptor --------- //

		// --------- Access Interceptor --------- //
		DaoAccessInterceptor daoAccessInterceptor = new DaoAccessInterceptor();
		requestInjection(daoAccessInterceptor);
		Matcher accessClassMatcher = Matchers.subclassesOf(BaseDao.class);
		Matcher accessMethodMatcher = annotatedWithAnyOf(assertPrivilegeAnnotations).and(nonSyntheticMethodMatcher());
		bindInterceptor(accessClassMatcher,accessMethodMatcher, daoAccessInterceptor);
		// --------- /Access Interceptor --------- //

		// --------- For DaoRegistry --------- //
		// Find and bind the dao for each Entity class (and create a genericDao instance if none defined).
		// Note: This is not very "pure Guice" but it provides a great flexibility as it allows to have IDao<EntityClass>
		//       pattern regardless if there is a specific dao define for this entity (either the concrete dao will be taken
		//       or a instance of the GenericDao will be created if not found).
		//       In other word, a little hack for lot of elegancy.

		for (Class entityClass : entityClasses){
			bindDao(entityClass);
		}
		// --------- /For DaoRegistry --------- //
	}

	/**
	 * Return the Db JomniMapper for now.
	 */
	@Inject
	@Provides
	@Singleton
	public JomniMapper providesJomniMapper(DaoHelper daoHelper){
		return daoHelper.jomni;
	}

	// --------- For AOP Matching --------- //
	static private Matcher annotatedWithAnyOf(Class<? extends Annotation>... annotationTypes){
		Matcher m = Matchers.annotatedWith(annotationTypes[0]);
		if (annotationTypes.length > 1){
			for (Class<? extends Annotation> an : asList(annotationTypes).subList(1,annotationTypes.length)) {
				m = m.or(Matchers.annotatedWith(an));
			}
		}
		return m;
	}

	/**
	 * See: https://groups.google.com/forum/#!topic/google-guice/GqGJr2P99tU
	 *
	 * This allows to avoid intercepting the Synthetic method.
	 * @return
	 */
	static private Matcher nonSyntheticMethodMatcher(){
		Matcher m = new AbstractMatcher<Method>() {

			@Override
			public boolean matches(Method m) {
				return !m.isSynthetic();
			}
		};
		return m;
	}


	static private Matcher matchAnyOf(Class... classes) {
		Set<Class> classSet = new HashSet<>(asList(classes));
		return matchClass(c -> classSet.contains(c));
	}

	static private Matcher matchAbstractClass(){
		return matchClass(c -> Modifier.isAbstract(c.getModifiers()));
	}


	static private Matcher matchClass(Predicate<Class> predicate) {
		return new AbstractMatcher<Class>() {
			@Override
			public boolean matches(Class c) {
				return predicate.test(c);
			}
		};
	}
	// --------- /For AOP Matching --------- //

	// --------- For DaoRegistry --------- //
	// Just return the static entityClasses value, allowing @EntityClasses to be injected.
	@Provides
	@Singleton
	@EntityClasses
	public Class[] provideEntityClasses() {
			return entityClasses;
	}
	
	
	private <T> void bindDao(final Class entityClass){
		final Type idClass = GenericTypeReflector.getTypeParameter(entityClass, BaseEntity.class.getTypeParameters()[0]);

		Type daoParamType = new ParameterizedType() {
			public Type getRawType() {
				return IDao.class;
			}

			public Type getOwnerType() {
				return null;
			}

			public Type[] getActualTypeArguments() {
				return new Type[] {entityClass,idClass};
			}
		};
		
		DaoProvider daoProvider = new DaoProvider(entityClass);
		requestInjection(daoProvider);
		bind(TypeLiteral.get(daoParamType)).toProvider((javax.inject.Provider) daoProvider);
	}
	// --------- /For DaoRegistry --------- //
	
}

// --------- For DaoRegistry --------- //
class DaoProvider implements Provider{
	
	private Class entityClass;
	
	@Inject
	private DaoRegistry daoRegistry;

	public DaoProvider(Class entityClass){
		this.entityClass = entityClass;
	}

	@Override
	public Object get() {
		IDao dao = daoRegistry.getDao(entityClass);
		return dao;
	}
}
// --------- /For DaoRegistry --------- //
