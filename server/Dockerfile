FROM nikolaik/python-nodejs:python3.8-nodejs12

RUN mkdir /usr/local/share/fonts/example
COPY arial.ttf /usr/local/share/fonts/example
COPY arial-bold.ttf /usr/local/share/fonts/example

WORKDIR /app
RUN useradd -M node

COPY ./package*.json ./
RUN npm config set registry https://npm.timetoactgroup.com
RUN npm ci --prod
COPY .. ./

RUN chown -R node /app

USER node

CMD npm start
