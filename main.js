function qs(selector, scope) {
  return (scope || document).querySelector(selector);
}

function qsa(selector, scope) {
  return (scope || document).querySelectorAll(selector);
}

function $on(target, type, cb, useCapture) {
  target.addEventListener(type, cb, !!useCapture);
}

function $delegate(target, selector, type, handler) {
  const useCapture = type === "blur" || type === "focus";
  function dispatchEvent(e) {
    const targetEl = e.target;
    const potentialEls = qsa(selector, target);
    if (Array.from(potentialEls).includes(targetEl)) {
      handler.call(targetEl, e);
    }
  }
  $on(target, type, dispatchEvent, useCapture);
}

function $parent(node, tagName) {
  if (!node.parentNode) {
    return undefined;
  }

  if (node.parentNode.tagName.toLowerCase() === tagName.toLowerCase()) {
    return node.parentNode;
  }
  return $parent(node.parentNode, tagName);
}

const WikiAPI = (function() {
  const defaultUrl = "https://en.wikipedia.org/api/rest_v1/page/";
  function getJSON(url) {
    return fetch(url, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(res => res.json())
      .catch(err => err);
  }
  const fetchRandArticle = function() {
    const url = `${defaultUrl}random/summary`;
    return getJSON(url);
  };

  const fetchSearchQuery = function(query) {
    const url = `${defaultUrl}summary/${query}`;
    return getJSON(url);
  };

  const fetchRelatedArticles = function(query) {
    const url = `${defaultUrl}related/${query}`;
    return getJSON(url);
  };

  return {
    fetchRandArticle,
    fetchSearchQuery,
    fetchRelatedArticles
  };
})();

const model = (function() {
  const state = {
    currentQuery: "",
    articles: [],
    relatedArticles: []
  };

  const addArticles = function(arts) {
    arts.forEach(art => {
      state.articles.push(art);
    });
  };

  const addRelated = function(titles) {
    titles.forEach(title => {
      state.relatedArticles.push(title);
    });
  };

  const setQuery = function(query) {
    state.currentQuery = query;
  };

  const resetState = function() {
    state.currentQuery = "";
    state.articles = [];
    state.relatedArticles = [];
  };

  return {
    state,
    resetState,
    addArticles,
    setQuery,
    addRelated
  };
})();

const view = (function() {
  const drawError = function(message) {
    const errorNotif = `<div class="is-warning notification" style="width: 30%; display: block; margin: auto;">${message}</div>`;
    const cont = qs(".container");
    cont.insertAdjacentHTML("afterbegin", errorNotif);
    setTimeout(() => {
      const notif = qs(".notification");
      $parent(notif, "div").removeChild(notif);
    }, 2000);
  };

  const renderArticle = function(state) {
    const notFound = "http://www.51allout.co.uk/wp-content/uploads/2012/02/Image-not-found.gif";
    const articlesUl = qs("#resultsList");
    const imgSrc = state.originalimage !== undefined ? state.originalimage.source : notFound;
    const articleLi = `<li class="has-text-centered"><h1 class="title">${
      state.title
    }</h1><img style="width: 30%;" src="${imgSrc}"><p class="subtitle">${state.extract}</p></li>`;
    articlesUl.insertAdjacentHTML("beforeend", articleLi);
  };

  const drawSpinner = function() {
    const cont = qs("#resultsList");
    const spinner = `<span class="loading"><i class="fa fa-spinner fa-spin fa-lg" style="display: block; margin: auto; margin-top: 1.75rem;"></i></span>`;
    cont.insertAdjacentHTML("beforeend", spinner);
  };

  const clearText = function() {
    qs("#resultsList").innerHTML = "";
  };

  const renderRelated = function(titles) {
    const cont = qs("#resultsList");
    let related = ``;
    titles.forEach(title => {
      related += `<h1 class="related title" style="margin-top: 0.75rem;">${title.title.replace(/_/g, " ")}</h1>`;
    });
    cont.insertAdjacentHTML("beforeend", related);
  };

  return {
    drawError,
    renderArticle,
    clearText,
    drawSpinner,
    renderRelated
  };
})();

const handlers = (function() {
  const fetchRandListener = function() {
    const randBtn = qs("#randomArticle");
    function getArticle() {
      model.resetState();
      view.clearText();
      view.drawSpinner();
      WikiAPI.fetchRandArticle()
        .then(res => {
          view.clearText();
          model.addArticles([res]);
          view.renderArticle(res);
        })
        .catch(view.drawError);
    }
    $on(randBtn, "click", getArticle);
  };

  const relatedListener = function() {
    function getRelated(e) {
      const relatedVal = e.target.innerHTML.replace(/ /g, "_");
      model.resetState();
      view.clearText();
      view.drawSpinner();
      getQuery(relatedVal);
    }
    $delegate(qs("ul"), ".related", "click", getRelated);
  };

  const getQuery = function(query) {
    WikiAPI.fetchSearchQuery(query)
      .then(res => {
        view.clearText();
        model.resetState();
        model.setQuery(query);
        model.addArticles([res]);
        view.renderArticle(model.state.articles[0]);
        WikiAPI.fetchRelatedArticles(model.state.currentQuery)
          .then(resp => {
            model.addRelated([...resp.pages]);
            view.renderRelated(model.state.relatedArticles);
            relatedListener();
          })
          .catch(view.drawError);
      })
      .catch(err => {
        view.clearText();
        view.drawError(err);
      });
  };

  const fetchQuery = function() {
    const searchBtn = qs("#searchBtn");
    function fetchSearch() {
      const inputVal = qs("#searchArticle").value;
      if (inputVal === "") {
        view.clearText();
        view.drawError("Please search a valid term.");
      } else {
        view.drawSpinner();
        getQuery(inputVal);
      }
    }
    $on(searchBtn, "click", fetchSearch);
  };

  return {
    fetchRandListener,
    fetchQuery
  };
})();

$on(document, "DOMContentLoaded", () => {
  handlers.fetchRandListener();
  handlers.fetchQuery();
});
